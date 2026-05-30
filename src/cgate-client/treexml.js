const { parseString } = require('xml2js');

// C-Gate emits TREEXML as lines prefixed with a 3-digit response code and a
// '-' (continuation) or space (final). Strip prefixes and the terminating
// 344 line, leaving the concatenated XML payload.
function stripResponseCodes(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => {
      const m = line.match(/^(\d{3})[- ](.*)$/);
      if (!m) return line;
      const [, code, rest] = m;
      if (code === '344') return '';      // terminating line, drop body
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
// KNOWN LIMITATION: C-Gate also has an alternate FLAT format where a Unit's
// `Application`/`Groups` arrive as comma-separated strings rather than nested
// <Application>/<Group> elements. That variant is not handled here yet — it is
// a tracked follow-up and out of scope for this fix.
async function parseTreeXml(raw, networkAddress) {
  const xml = stripResponseCodes(raw);
  const parsed = await parseXmlString(xml);

  // Guard against empty/garbled payloads (xml2js yields null/undefined): return
  // an empty network rather than dereferencing null.
  const netNode = resolveNetworkNode(parsed, networkAddress);
  if (!netNode) {
    return [{ kind: 'network', address: String(networkAddress), label: null, applications: [] }];
  }

  const address = String(netNode.NetworkNumber || networkAddress);

  const appsById = new Map();
  for (const unit of toArray(netNode.Unit)) {
    for (const app of toArray(unit.Application)) {
      const appAddr = app.ApplicationAddress != null ? String(app.ApplicationAddress) : null;
      if (!appAddr) continue;
      if (!appsById.has(appAddr)) appsById.set(appAddr, new Map());
      const groupMap = appsById.get(appAddr);
      for (const g of toArray(app.Group)) {
        if (g.GroupAddress === undefined || g.GroupAddress === null) continue;
        const groupAddr = String(g.GroupAddress);
        if (groupMap.has(groupAddr)) continue;
        groupMap.set(groupAddr, {
          kind: 'group',
          address: `${address}/${appAddr}/${groupAddr}`,
          network: address,
          application: appAddr,
          group: groupAddr,
          label: (g.Label && String(g.Label).trim()) || null,
        });
      }
    }
  }

  const applications = [...appsById.entries()]
    .map(([appAddr, groupMap]) => ({
      kind: 'application',
      address: appAddr,
      label: null,
      groups: [...groupMap.values()].sort((a, b) => Number(a.group) - Number(b.group)),
    }))
    .sort((a, b) => Number(a.address) - Number(b.address));

  return [{ kind: 'network', address, label: null, applications }];
}

module.exports = { stripResponseCodes, parseTreeXml };
