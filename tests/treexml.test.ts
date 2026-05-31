const { stripResponseCodes, parseTreeXml, appName, deviceCategory } = require('../src/cgate-client/treexml');

describe('treexml', () => {
  it('strips 3-digit C-Gate response-code prefixes from data lines', () => {
    const raw = '343-Begin\r\n343-<Network><NetworkNumber>254</NetworkNumber></Network>\r\n344 End.\r\n';
    const xml = stripResponseCodes(raw);
    expect(xml).toContain('<Network>');
    expect(xml).not.toContain('343-');
    expect(xml).not.toContain('344 End');
  });

  it('parses framed TREEXML into a Tree of networks/apps/groups', async () => {
    const raw =
      '343-Begin\r\n' +
      '343-<Network><NetworkNumber>254</NetworkNumber><Unit><Application>' +
      '<ApplicationAddress>56</ApplicationAddress>' +
      '<Group><GroupAddress>4</GroupAddress><Label>Kitchen</Label></Group>' +
      '</Application></Unit></Network>\r\n' +
      '344 End.\r\n';
    const tree = await parseTreeXml(raw, '254');
    expect(tree).toHaveLength(1);
    expect(tree[0].address).toBe('254');
    expect(tree[0].applications[0].address).toBe('56');
    expect(tree[0].applications[0].groups[0]).toMatchObject({
      address: '254/56/4', group: '4', label: 'Kitchen',
    });
  });

  it('parses the real Network.Interface.Network nested structure', async () => {
    const raw =
      '343-Begin XML snippet\r\n' +
      '347-<Network><Interface><Network><NetworkNumber>254</NetworkNumber><Unit><Application>' +
      '<ApplicationAddress>56</ApplicationAddress>' +
      '<Group><GroupAddress>4</GroupAddress><Label>Kitchen</Label></Group>' +
      '<Group><GroupAddress>5</GroupAddress><Label>Hallway</Label></Group>' +
      '</Application></Unit></Network></Interface></Network>\r\n' +
      '344 End XML snippet.\r\n';
    const tree = await parseTreeXml(raw, '254');
    expect(tree).toHaveLength(1);
    expect(tree[0].address).toBe('254');
    expect(tree[0].applications[0].address).toBe('56');
    expect(tree[0].applications[0].groups).toHaveLength(2);
    expect(tree[0].applications[0].groups[0]).toMatchObject({
      address: '254/56/4', group: '4', label: 'Kitchen',
    });
    expect(tree[0].applications[0].groups[1]).toMatchObject({
      group: '5', label: 'Hallway',
    });
  });

  it('sorts groups numerically and dedups', async () => {
    const raw =
      '343-Begin XML snippet\r\n' +
      '347-<Network><Interface><Network><NetworkNumber>254</NetworkNumber><Unit><Application>' +
      '<ApplicationAddress>56</ApplicationAddress>' +
      '<Group><GroupAddress>12</GroupAddress><Label>Twelve</Label></Group>' +
      '<Group><GroupAddress>4</GroupAddress><Label>Four</Label></Group>' +
      '<Group><GroupAddress>4</GroupAddress><Label>Duplicate</Label></Group>' +
      '</Application></Unit></Network></Interface></Network>\r\n' +
      '344 End XML snippet.\r\n';
    const tree = await parseTreeXml(raw, '254');
    const groups = tree[0].applications[0].groups;
    expect(groups).toHaveLength(2);
    expect(groups.map((g: any) => g.group)).toEqual(['4', '12']);
    expect(groups[0].label).toBe('Four');
  });

  it('treats empty/garbled TREEXML as an empty network rather than throwing', async () => {
    const tree = await parseTreeXml('', '254');
    expect(tree).toEqual([
      { kind: 'network', address: '254', label: null, applications: [], units: [] },
    ]);
  });

  it('rejects when the XML payload is malformed', async () => {
    const raw = '343-Begin\r\n343-<Network\r\n344 End.\r\n';
    await expect(parseTreeXml(raw, '254')).rejects.toThrow('TREEXML parse error');
  });

  it('drops lines that are not TREEXML response codes (343/347)', () => {
    // Only 343 (start) and 347 (data) bodies belong to the XML payload; an
    // async event line (no code) or a 300 status line must be discarded.
    expect(stripResponseCodes('lighting on 254/56/4')).toBe('');
    expect(stripResponseCodes('300 //PROJECT/254/56/1: level=255')).toBe('');
  });

  it('ignores async event/status lines interleaved into the TREEXML frame', async () => {
    // Real C-Gate (with EVENT ON active) can interleave live events into the
    // command-stream TREEXML response. They must not corrupt the parse.
    const raw =
      '343-Begin XML snippet\r\n' +
      '347-<Network><Interface><Network><NetworkNumber>254</NetworkNumber><Unit><Application>\r\n' +
      'lighting on 254/56/4\r\n' +                       // interleaved async event
      '300 //PROJECT/254/56/9: level=128\r\n' +          // interleaved status event
      '347-<ApplicationAddress>56</ApplicationAddress>\r\n' +
      '347-<Group><GroupAddress>4</GroupAddress><Label>Kitchen</Label></Group>\r\n' +
      '347-</Application></Unit></Network></Interface></Network>\r\n' +
      '344 End XML snippet.\r\n';
    const tree = await parseTreeXml(raw, '254');
    expect(tree[0].address).toBe('254');
    expect(tree[0].applications[0].groups[0]).toMatchObject({ group: '4', label: 'Kitchen' });
  });

  it('falls back to a nested network node that lacks Units / id match', async () => {
    const raw =
      '347-<Network><Interface><Network><NetworkNumber>254</NetworkNumber>' +
      '</Network></Interface></Network>\r\n344 End.\r\n';
    const tree = await parseTreeXml(raw, '999');
    expect(tree[0].address).toBe('254');
    expect(tree[0].applications).toEqual([]);
  });

  it('falls back to the flat network node when no interface wrapper exists', async () => {
    const raw =
      '347-<Network><NetworkNumber>254</NetworkNumber></Network>\r\n344 End.\r\n';
    const tree = await parseTreeXml(raw, '999');
    expect(tree[0].address).toBe('254');
  });

  it('parses the FLAT format C-Gate v3.x emits (physical units + derived groups)', async () => {
    // Mirrors a real "TREEXML 254" response: <Unit>s with Type/Address/PartName
    // and comma-separated Application/Groups (no nested <Application> elements).
    const raw =
      '343-Begin XML Snippet\r\n' +
      '347-<Network>\r\n' +
      '347- <Unit><Type>RELDN12</Type><Version>2.7.00</Version><SerialNo>100906.2211</SerialNo>' +
      '<Address>2</Address><PartName>RELAY3  </PartName><Application>56, 255</Application>' +
      '<Groups>103,104,72,72</Groups></Unit>\r\n' +
      '347- <Unit><Type>PC_CNIED</Type><Version>5.4.00</Version><SerialNo>100838.3508</SerialNo>' +
      '<Address>8</Address><PartName>SAVANT  </PartName><Application>255, 255</Application>' +
      '<Groups></Groups></Unit>\r\n' +
      '347-</Network>\r\n' +
      '344 End XML Snippet\r\n';
    const tree = await parseTreeXml(raw, '254');
    const net = tree[0];
    expect(net.address).toBe('254');

    // Physical devices are surfaced as units, sorted by address.
    expect(net.units).toHaveLength(2);
    expect(net.units[0]).toMatchObject({
      address: '2', name: 'RELAY3', type: 'RELDN12', category: 'Relay',
      firmware: '2.7.00', serial: '100906.2211',
      applications: ['56', '255'], groups: ['103', '104', '72'],
    });
    expect(net.units[1]).toMatchObject({ address: '8', name: 'SAVANT', category: 'Interface' });

    // Applications are derived from the units; the lighting app gets a name and
    // its groups (deduped) attributed from the unit's primary (non-255) app.
    const lighting = net.applications.find((a: any) => a.address === '56');
    expect(lighting.label).toBe('Lighting');
    expect(lighting.groups.map((g: any) => g.group)).toEqual(['72', '103', '104']);
    expect(lighting.groups[0].address).toBe('254/56/72');
    // App 255 is present (declared by units) but carries no lighting groups.
    expect(net.applications.find((a: any) => a.address === '255').groups).toEqual([]);
  });

  it('maps application addresses and device types to friendly names', () => {
    expect(appName('56')).toBe('Lighting');
    expect(appName('72')).toBe('Lighting'); // within 48-95 lighting range
    expect(appName('202')).toBe('Trigger Control');
    expect(appName('255')).toBe('Network');
    expect(appName('999')).toBeNull();
    expect(deviceCategory('DIMDC8')).toBe('Dimmer');
    expect(deviceCategory('KEYGL5')).toBe('Switch');
    expect(deviceCategory('SENPIROA')).toBe('Sensor');
    expect(deviceCategory(null)).toBeNull();
  });

  it('missing Label yields null', async () => {
    const raw =
      '343-Begin XML snippet\r\n' +
      '347-<Network><Interface><Network><NetworkNumber>254</NetworkNumber><Unit><Application>' +
      '<ApplicationAddress>56</ApplicationAddress>' +
      '<Group><GroupAddress>4</GroupAddress></Group>' +
      '</Application></Unit></Network></Interface></Network>\r\n' +
      '344 End XML snippet.\r\n';
    const tree = await parseTreeXml(raw, '254');
    expect(tree[0].applications[0].groups[0].label).toBeNull();
  });
});
