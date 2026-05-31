// Export a C-Bus tag-database XML document compatible with C-Bus Toolkit /
// C-Gate project files. Mirrors the Installation > Project > Network >
// Application > Group hierarchy that cbusProjectParser.js accepts on import
// (attribute and child-element TagName/Address shapes).

/** Escape text for XML element content or double-quoted attributes. */
function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Sort C-Bus numeric addresses (254, 56, 4) in ascending order. */
function cmpAddress(a, b) {
    const na = Number(a);
    const nb = Number(b);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return String(a).localeCompare(String(b));
}

function indent(level) {
    return '  '.repeat(level);
}

function childTag(level, name, value) {
    return `${indent(level)}<${name}>${escapeXml(value)}</${name}>`;
}

/**
 * Build Toolkit-compatible tag-database XML from a device tree.
 *
 * @param {Object} input
 * @param {Array} input.tree - NetworkNode[] from the live TREEXML parse
 * @param {string|null|undefined} [input.projectName] - C-Gate project name
 * @returns {{ xml: string, stats: { networkCount: number, groupCount: number, labelCount: number, unitCount: number } }}
 */
function exportLabelsXml(input) {
    const tree = input?.tree || [];
    const projectName = input?.projectName?.trim() || null;

    let groupCount = 0;
    let labelCount = 0;
    let unitCount = 0;

    const lines = [
        '<?xml version="1.0" encoding="utf-8"?>',
        '<Installation>',
        `${indent(1)}<DBVersion>2.3</DBVersion>`,
        `${indent(1)}<Version>1.0</Version>`,
        `${indent(1)}<Project>`,
    ];

    if (projectName) {
        lines.push(childTag(2, 'TagName', projectName));
        lines.push(childTag(2, 'Address', projectName));
    }

    const networks = [...tree].sort((a, b) => cmpAddress(a.address, b.address));

    for (const net of networks) {
        lines.push(`${indent(2)}<Network>`);
        if (net.label) lines.push(childTag(3, 'TagName', net.label));
        lines.push(childTag(3, 'Address', net.address));
        lines.push(childTag(3, 'NetworkNumber', net.address));

        const apps = [...(net.applications || [])].sort((a, b) => cmpAddress(a.address, b.address));
        for (const app of apps) {
            lines.push(`${indent(3)}<Application>`);
            if (app.label) lines.push(childTag(4, 'TagName', app.label));
            lines.push(childTag(4, 'Address', app.address));

            const groups = [...(app.groups || [])].sort((a, b) => cmpAddress(a.group, b.group));
            for (const group of groups) {
                groupCount++;
                lines.push(`${indent(4)}<Group>`);
                if (group.label) {
                    labelCount++;
                    lines.push(childTag(5, 'TagName', group.label));
                }
                lines.push(childTag(5, 'Address', group.group));
                lines.push(`${indent(4)}</Group>`);
            }

            lines.push(`${indent(3)}</Application>`);
        }

        const units = [...(net.units || [])].sort((a, b) => cmpAddress(a.address, b.address));
        for (const unit of units) {
            unitCount++;
            lines.push(`${indent(3)}<Unit>`);
            if (unit.name) lines.push(childTag(4, 'TagName', unit.name));
            lines.push(childTag(4, 'Address', unit.address));
            if (unit.type) lines.push(childTag(4, 'CatalogNumber', unit.type));
            lines.push(`${indent(3)}</Unit>`);
        }

        lines.push(`${indent(2)}</Network>`);
    }

    lines.push(`${indent(1)}</Project>`);
    lines.push('</Installation>');

    return {
        xml: lines.join('\n'),
        stats: {
            networkCount: networks.length,
            groupCount,
            labelCount,
            unitCount,
        },
    };
}

/**
 * Alternate attribute-based export (Installation > Project > Network >
 * Application > Group with Address/TagName attributes). Matches the shape used
 * in many Toolkit backup files and our import test fixtures.
 */
function exportLabelsXmlAttributes(input) {
    const tree = input?.tree || [];
    const projectName = input?.projectName?.trim() || null;

    let groupCount = 0;
    let labelCount = 0;
    let unitCount = 0;

    const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<Installation>', '  <Project>'];

    if (projectName) {
        lines.push(`    <TagName>${escapeXml(projectName)}</TagName>`);
    }

    const networks = [...tree].sort((a, b) => cmpAddress(a.address, b.address));
    for (const net of networks) {
        const netAttrs = { Address: net.address };
        if (net.label) netAttrs.TagName = net.label;
        lines.push(`    <Network ${Object.entries(netAttrs).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(' ')}>`);

        const apps = [...(net.applications || [])].sort((a, b) => cmpAddress(a.address, b.address));
        for (const app of apps) {
            const appOpen = [`Address="${escapeXml(app.address)}"`];
            if (app.label) appOpen.unshift(`TagName="${escapeXml(app.label)}"`);
            lines.push(`      <Application ${appOpen.join(' ')}>`);

            const groups = [...(app.groups || [])].sort((a, b) => cmpAddress(a.group, b.group));
            for (const group of groups) {
                groupCount++;
                const attrs = [`Address="${escapeXml(group.group)}"`];
                if (group.label) {
                    labelCount++;
                    attrs.unshift(`TagName="${escapeXml(group.label)}"`);
                }
                lines.push(`        <Group ${attrs.join(' ')}/>`);
            }

            lines.push('      </Application>');
        }

        const units = [...(net.units || [])].sort((a, b) => cmpAddress(a.address, b.address));
        for (const unit of units) {
            unitCount++;
            const attrs = [`Address="${escapeXml(unit.address)}"`];
            if (unit.name) attrs.unshift(`TagName="${escapeXml(unit.name)}"`);
            lines.push(`      <Unit ${attrs.join(' ')}/>`);
        }

        lines.push('    </Network>');
    }

    lines.push('  </Project>', '</Installation>');

    return {
        xml: lines.join('\n'),
        stats: { networkCount: networks.length, groupCount, labelCount, unitCount },
    };
}

module.exports = { exportLabelsXml, exportLabelsXmlAttributes, escapeXml, cmpAddress };
