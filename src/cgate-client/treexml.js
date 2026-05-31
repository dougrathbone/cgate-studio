const { parseString } = require('xml2js');

// TREEXML response codes: 343 = start line, 347 = data line. Every line of the
// XML payload is prefixed with one of these and a '-' (continuation) or space
// (final). 344 terminates the response.
const TREE_XML_CODES = new Set(['343', '347']);

// C-Gate emits TREEXML as code-prefixed lines. Keep ONLY the bodies of 343/347
// lines, which together form the XML payload. Everything else is discarded:
// the 344 terminator, the "Begin"/"End" markers, and — crucially — any async
// event/status lines that interleave into the stream while EVENT ON is active
// (e.g. "lighting on 254/56/4" or "300 //PROJECT/...: level=255"). Without this
// those interleaved lines would be concatenated into the XML and break the
// parse, so a live network would fail to browse on connect.
function stripResponseCodes(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => {
      const m = line.match(/^(\d{3})[- ](.*)$/);
      if (!m) return '';                          // non-coded async line — drop
      const [, code, rest] = m;
      if (!TREE_XML_CODES.has(code)) return '';   // 344 / unrelated event code — drop
      if (rest.startsWith('Begin')) return '';
      return rest;
    })
    .join('')
    .trim();
}

function toArray(v) {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function strOrNull(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

// Split a comma-separated C-Gate list (e.g. "56, 255" or "103,104,104") into a
// de-duplicated array of trimmed, non-empty tokens, preserving first-seen order.
function parseCsvList(v) {
  const out = [];
  const seen = new Set();
  for (const item of toArray(v)) {
    if (item === undefined || item === null || typeof item === 'object') continue;
    for (const token of String(item).split(',')) {
      const t = token.trim();
      if (t && !seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
  }
  return out;
}

// Resolve well-known C-Bus application addresses to friendly names. The lighting
// applications occupy 0x30-0x5F (48-95); the rest are common fixed assignments.
function appName(address) {
  const n = Number(address);
  if (!Number.isNaN(n)) {
    if (n >= 48 && n <= 95) return 'Lighting';
    if (n === 202) return 'Trigger Control';
    if (n === 203) return 'Enable Control';
    if (n === 228) return 'Measurement';
    if (n === 255) return 'Network';
  }
  return null;
}

// Map a unit's catalogue/type code to a friendly device class for display.
function deviceCategory(type) {
  if (!type) return null;
  const t = String(type).toUpperCase();
  if (t.startsWith('DIM')) return 'Dimmer';
  if (t.startsWith('REL')) return 'Relay';
  if (t.startsWith('KEY') || t.startsWith('DLT') || t.startsWith('NEO') || t.startsWith('SAT')) return 'Switch';
  if (t.startsWith('SEN') || t.includes('PIR')) return 'Sensor';
  if (t.startsWith('ANO') || t.startsWith('AOU')) return 'Analog Output';
  if (t.startsWith('PC') || t.includes('CNI') || t.includes('PCI')) return 'Interface';
  if (t.startsWith('BCN')) return 'Indicator';
  return 'Device';
}

// Descend to the real network node, mirroring cgateweb's findNetworkData
// priority. Real C-Gate frames TREEXML as Network > Interface > Network >
// { NetworkNumber, Unit }, but a flattened Network > { NetworkNumber, Unit }
// shape also occurs. Prefer a node that actually carries Units or matches the
// requested NetworkNumber so we never bind to an empty wrapper.
function resolveNetworkNode(parsed, networkAddress) {
  if (!parsed || typeof parsed !== 'object') return null;
  const idStr = String(networkAddress);
  const hasUnit = (n) => n && typeof n === 'object' && n.Unit !== undefined;
  const matchesId = (n) => n && typeof n === 'object' && String(n.NetworkNumber) === idStr;

  const viaInterface = parsed.Network && parsed.Network.Interface && parsed.Network.Interface.Network;
  if (viaInterface && (hasUnit(viaInterface) || matchesId(viaInterface))) return viaInterface;

  if (parsed.Network && (hasUnit(parsed.Network) || matchesId(parsed.Network))) return parsed.Network;

  if (hasUnit(parsed) || matchesId(parsed)) return parsed;

  // Fall back to the nested node even without Unit/id match, then the outer
  // wrapper, so we key off whatever NetworkNumber is available.
  if (viaInterface) return viaInterface;
  if (parsed.Network) return parsed.Network;

  return null;
}

function parseXmlString(xml) {
  return new Promise((resolve, reject) => {
    parseString(xml, { explicitArray: false, mergeAttrs: true }, (err, result) => {
      if (err) reject(new Error(`TREEXML parse error: ${err.message}`));
      else resolve(result);
    });
  });
}

// Build the Tree shape from src/shared/types.ts out of parsed TREEXML.
//
// Handles both TREEXML shapes that C-Gate emits:
//   * NESTED  — each <Unit> contains <Application><ApplicationAddress/>
//               <Group><GroupAddress/><Label/></Group></Application>, giving
//               per-group labels.
//   * FLAT    — each <Unit> is a physical device with <Type>, <Address>,
//               <PartName>, plus <Application>/<Groups> as comma-separated
//               strings (no per-group labels). This is what live C-Gate v3.x
//               returns. Groups are attributed to the unit's primary (non-255)
//               application.
async function parseTreeXml(raw, networkAddress) {
  const xml = stripResponseCodes(raw);
  const parsed = await parseXmlString(xml);

  // Guard against empty/garbled payloads (xml2js yields null/undefined): return
  // an empty network rather than dereferencing null.
  const netNode = resolveNetworkNode(parsed, networkAddress);
  if (!netNode) {
    return [{ kind: 'network', address: String(networkAddress), label: null, applications: [], units: [] }];
  }

  const address = String(netNode.NetworkNumber || networkAddress);

  const appsById = new Map(); // appAddr -> Map(groupAddr -> GroupNode)
  const ensureApp = (appAddr) => {
    if (!appsById.has(appAddr)) appsById.set(appAddr, new Map());
    return appsById.get(appAddr);
  };
  const addGroup = (appAddr, groupAddr, label) => {
    const groupMap = ensureApp(appAddr);
    const existing = groupMap.get(groupAddr);
    if (existing) {
      if (label && !existing.label) existing.label = label; // upgrade null label
      return;
    }
    groupMap.set(groupAddr, {
      kind: 'group',
      address: `${address}/${appAddr}/${groupAddr}`,
      network: address,
      application: appAddr,
      group: groupAddr,
      label: label || null,
    });
  };

  const units = [];
  for (const unit of toArray(netNode.Unit)) {
    const unitApps = parseCsvList(unit.Application);
    const unitGroups = parseCsvList(unit.Groups);
    const unitAddr =
      strOrNull(unit.Address) ?? strOrNull(unit.UnitAddress);
    if (unitAddr !== null) {
      const type = strOrNull(unit.Type) ?? strOrNull(unit.UnitType);
      units.push({
        kind: 'unit',
        address: unitAddr,
        name: strOrNull(unit.PartName) ?? strOrNull(unit.UnitName) ?? strOrNull(unit.Label),
        type,
        category: deviceCategory(type),
        firmware: strOrNull(unit.Version) ?? strOrNull(unit.FirmwareVersion),
        serial: strOrNull(unit.SerialNo) ?? strOrNull(unit.Serial),
        applications: unitApps,
        groups: unitGroups,
      });
    }

    // Register every application the unit declares so it appears in the tree
    // even when it carries no (resolvable) groups.
    for (const a of unitApps) ensureApp(a);

    // NESTED: <Application> elements carry ApplicationAddress + labelled groups.
    const nestedApps = toArray(unit.Application).filter(
      (a) => a && typeof a === 'object' && a.ApplicationAddress != null,
    );
    if (nestedApps.length) {
      for (const app of nestedApps) {
        const appAddr = String(app.ApplicationAddress);
        ensureApp(appAddr);
        for (const g of toArray(app.Group)) {
          if (g.GroupAddress === undefined || g.GroupAddress === null) continue;
          addGroup(appAddr, String(g.GroupAddress), (g.Label && String(g.Label).trim()) || null);
        }
      }
    } else if (unitGroups.length) {
      // FLAT: attribute the unit's groups to its primary application (the first
      // that isn't the 255 network/management pseudo-application).
      const primary = unitApps.find((a) => a !== '255') ?? unitApps[0];
      if (primary) for (const groupAddr of unitGroups) addGroup(primary, groupAddr, null);
    }
  }

  const applications = [...appsById.entries()]
    .map(([appAddr, groupMap]) => ({
      kind: 'application',
      address: appAddr,
      label: appName(appAddr),
      groups: [...groupMap.values()].sort((a, b) => Number(a.group) - Number(b.group)),
    }))
    .sort((a, b) => Number(a.address) - Number(b.address));

  units.sort((a, b) => Number(a.address) - Number(b.address));

  return [{ kind: 'network', address, label: null, applications, units }];
}

module.exports = { stripResponseCodes, parseTreeXml, appName, deviceCategory };
