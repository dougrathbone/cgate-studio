const { stripResponseCodes, parseTreeXml } = require('../src/cgate-client/treexml');

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
      { kind: 'network', address: '254', label: null, applications: [] },
    ]);
  });

  it('rejects when the XML payload is malformed', async () => {
    const raw = '343-Begin\r\n343-<Network\r\n344 End.\r\n';
    await expect(parseTreeXml(raw, '254')).rejects.toThrow('TREEXML parse error');
  });

  it('passes through lines without a response-code prefix', () => {
    expect(stripResponseCodes('<Raw>data</Raw>')).toBe('<Raw>data</Raw>');
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
