const path = require('path');
const AdmZip = require('adm-zip');
const { parseString } = require('xml2js');
const { createLogger } = require('./logger');

// Vendored from the sibling `cgateweb` project (src/cbusProjectParser.js) — see
// docs/context/vendoring-cgate-client.md. Kept close to upstream; the only
// deviation is _extractLabels also collecting network/application tag names
// (networkLabels / applicationLabels) so the desktop tree can be re-labelled at
// every level, not just groups.

// Maximum total decompressed bytes we will pull out of a .cbz archive.
// .cbz files are XML payloads zipped together; typical real files are well
// under 5MB extracted. Cap defends against zip-bomb uploads that could
// otherwise exhaust process memory before xml2js parsing fails.
const MAX_DECOMPRESSED_BYTES = 100 * 1024 * 1024; // 100MB

// Defence-in-depth: reject ZIP entry names containing path-traversal or
// absolute paths. The parser does not write extracted files to disk, but
// guarding here means a future change can't accidentally introduce one.
function _isSafeZipEntryName(name) {
    if (typeof name !== 'string' || name.length === 0) return false;
    if (path.posix.isAbsolute(name) || path.win32.isAbsolute(name)) return false;
    if (/^[A-Za-z]:/.test(name)) return false;
    const parts = name.split(/[/\\]/);
    return !parts.includes('..');
}

class CbusProjectParser {
    constructor(options = {}) {
        this.logger = createLogger({ component: 'CbusProjectParser' });
        this.maxDecompressedBytes = options.maxDecompressedBytes || MAX_DECOMPRESSED_BYTES;
    }

    /**
     * Parse a CBZ or XML buffer, auto-detecting the format.
     * @param {Buffer} inputBuffer - File contents
     * @param {string} [filename=''] - Original filename (format hint + metadata)
     * @param {Object} [options] - Parsing options
     * @param {string|number} [options.network] - Filter to a specific network address
     */
    async parse(inputBuffer, filename = '', options = {}) {
        let xmlString;

        if (this._isCBZ(inputBuffer)) {
            xmlString = this._extractCBZ(inputBuffer);
        } else {
            xmlString = inputBuffer.toString('utf8');
        }

        const parsed = await this._parseXML(xmlString);
        const result = this._extractLabels(parsed, options);
        result.source = filename;
        return result;
    }

    /** Parse a raw XML string directly. */
    async parseXML(xmlString, options = {}) {
        const parsed = await this._parseXML(xmlString);
        const result = this._extractLabels(parsed, options);
        result.source = 'xml';
        return result;
    }

    _isCBZ(buffer) {
        // ZIP files start with PK\x03\x04
        return buffer.length >= 4 &&
            buffer[0] === 0x50 && buffer[1] === 0x4B &&
            buffer[2] === 0x03 && buffer[3] === 0x04;
    }

    _extractCBZ(buffer) {
        const zip = new AdmZip(buffer);
        const entries = zip.getEntries();

        // Pre-flight against zip-bomb uploads: sum every entry's declared
        // uncompressed size before we decompress anything.
        let totalUncompressed = 0;
        for (const entry of entries) {
            const size = entry.header && entry.header.size;
            if (typeof size === 'number' && size > 0) {
                totalUncompressed += size;
                if (totalUncompressed > this.maxDecompressedBytes) {
                    throw new Error(
                        `CBZ archive decompressed size exceeds ${this.maxDecompressedBytes} bytes; rejecting (zip-bomb protection)`
                    );
                }
            }
        }

        const xmlEntry = entries.find(e => e.entryName.endsWith('.xml'));
        if (!xmlEntry) {
            throw new Error('CBZ archive does not contain an XML file');
        }

        if (!_isSafeZipEntryName(xmlEntry.entryName)) {
            throw new Error(`CBZ archive entry name rejected: ${xmlEntry.entryName}`);
        }

        this.logger.info(`Extracting ${xmlEntry.entryName} from CBZ`);
        return xmlEntry.getData().toString('utf8');
    }

    _parseXML(xmlString) {
        return new Promise((resolve, reject) => {
            parseString(xmlString, { explicitArray: false, ignoreAttrs: false, mergeAttrs: true }, (err, result) => {
                if (err) reject(new Error(`XML parse error: ${err.message}`));
                else resolve(result);
            });
        });
    }

    /**
     * Walk the parsed XML tree and extract network/app/group labels.
     * Handles CBZ Toolkit format (Installation > Project > Network > Application
     * > Group) and simpler C-Gate tag XML variants.
     */
    _extractLabels(parsed, options = {}) {
        const labels = {};              // "net/app/group" -> tagName (upstream-compatible)
        const applicationLabels = {};   // "net/app"       -> tagName
        const networkLabels = {};       // "net"           -> tagName
        const networks = [];
        let groupCount = 0;
        let labelCount = 0;
        const networkFilter = (options.network !== null && options.network !== undefined) ? String(options.network) : null;

        const networkNodes = this._findNetworks(parsed);

        for (const net of networkNodes) {
            const netAddr = this._getAddress(net);
            if (!netAddr) continue;
            if (networkFilter && netAddr !== networkFilter) continue;

            const netName = this._getTagName(net);
            networks.push({ address: netAddr, name: netName });
            if (netName) networkLabels[netAddr] = netName;

            const applications = this._findApplications(net);
            for (const app of applications) {
                const appAddr = this._getAddress(app);
                if (!appAddr) continue;

                const appName = this._getTagName(app);
                if (appName) applicationLabels[`${netAddr}/${appAddr}`] = appName;

                const groups = this._findGroups(app);
                for (const group of groups) {
                    const groupAddr = this._getAddress(group);
                    if (!groupAddr) continue;
                    groupCount++;

                    const tagName = this._getTagName(group);
                    if (tagName) {
                        labels[`${netAddr}/${appAddr}/${groupAddr}`] = tagName;
                        labelCount++;
                    }
                }
            }
        }

        return {
            labels,
            applicationLabels,
            networkLabels,
            networks,
            stats: { groupCount, labelCount, networkCount: networks.length },
            source: ''
        };
    }

    _findNetworks(parsed) {
        if (!parsed || typeof parsed !== 'object') return [];

        const installation = parsed.Installation || parsed.installation;
        if (installation) {
            const project = installation.Project || installation.project;
            if (project) {
                return this._toArray(project.Network || project.network);
            }
        }

        const project = parsed.Project || parsed.project;
        if (project) {
            return this._toArray(project.Network || project.network);
        }

        if (parsed.Network || parsed.network) {
            return this._toArray(parsed.Network || parsed.network);
        }

        // Walk one level for unknown wrapper elements
        for (const key of Object.keys(parsed)) {
            const child = parsed[key];
            if (child && typeof child === 'object') {
                if (child.Network || child.network) {
                    return this._toArray(child.Network || child.network);
                }
                if (child.Project || child.project) {
                    const p = child.Project || child.project;
                    return this._toArray(p.Network || p.network);
                }
            }
        }

        return [];
    }

    _findApplications(networkNode) {
        return this._toArray(networkNode.Application || networkNode.application);
    }

    _findGroups(appNode) {
        return this._toArray(appNode.Group || appNode.group);
    }

    _getAddress(node) {
        const candidates = [
            node.Address, node.address,
            node.NetworkNumber, node.network_number, node.networkNumber,
            node.ApplicationAddress, node.GroupAddress
        ];
        for (const val of candidates) {
            if (val !== null && val !== undefined) return String(val);
        }
        return null;
    }

    _getTagName(node) {
        const candidates = [
            node.TagName, node.tag_name, node.tagName,
            node.Label, node.label,
            node.Description, node.description
        ];
        for (const val of candidates) {
            if (val !== null && val !== undefined && typeof val === 'string' && val.trim()) return val.trim();
        }
        return null;
    }

    _toArray(val) {
        if (!val) return [];
        return Array.isArray(val) ? val : [val];
    }
}

module.exports = CbusProjectParser;
module.exports._isSafeZipEntryName = _isSafeZipEntryName;
