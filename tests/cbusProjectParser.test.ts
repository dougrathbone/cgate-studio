// Thorough coverage of the vendored C-Bus project parser across the schema
// variants and address/tag fallbacks real Toolkit / C-Gate exports use.
const CbusProjectParser = require('../src/cgate-client/cbusProjectParser');

function make() {
  return new CbusProjectParser();
}

describe('CbusProjectParser', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('parses Installation > Project > Network > Application > Group', async () => {
    const xml = `<Installation><Project>
      <Network Address="254" TagName="Home">
        <Application Address="56" TagName="Lighting">
          <Group Address="10" TagName="Kitchen"/>
          <Group Address="11"/>
        </Application>
      </Network>
    </Project></Installation>`;
    const r = await make().parseXML(xml);
    expect(r.labels).toEqual({ '254/56/10': 'Kitchen' });
    expect(r.applicationLabels).toEqual({ '254/56': 'Lighting' });
    expect(r.networkLabels).toEqual({ '254': 'Home' });
    expect(r.stats).toEqual({ networkCount: 1, groupCount: 2, labelCount: 1 });
    expect(r.source).toBe('xml');
  });

  it('parses a bare Project wrapper with multiple networks', async () => {
    const xml = `<Project>
      <Network Address="254"><Application Address="56"><Group Address="1" TagName="A"/></Application></Network>
      <Network Address="255"><Application Address="56"><Group Address="1" TagName="B"/></Application></Network>
    </Project>`;
    const r = await make().parseXML(xml);
    expect(r.labels).toEqual({ '254/56/1': 'A', '255/56/1': 'B' });
    expect(r.stats.networkCount).toBe(2);
  });

  it('parses Network at the document root', async () => {
    const xml = `<Network Address="254"><Application Address="56"><Group Address="1" TagName="Reception"/></Application></Network>`;
    const r = await make().parseXML(xml);
    expect(r.labels).toEqual({ '254/56/1': 'Reception' });
  });

  it('walks one level into an unknown wrapper containing Network', async () => {
    const xml = `<Root><Network Address="254"><Application Address="56"><Group Address="1" TagName="W"/></Application></Network></Root>`;
    const r = await make().parseXML(xml);
    expect(r.labels).toEqual({ '254/56/1': 'W' });
  });

  it('walks one level into an unknown wrapper containing Project', async () => {
    const xml = `<Root><Project><Network Address="254"><Application Address="56"><Group Address="1" TagName="P"/></Application></Network></Project></Root>`;
    const r = await make().parseXML(xml);
    expect(r.labels).toEqual({ '254/56/1': 'P' });
  });

  it('filters to a single network when the option is given', async () => {
    const xml = `<Project>
      <Network Address="254"><Application Address="56"><Group Address="1" TagName="Keep"/></Application></Network>
      <Network Address="255"><Application Address="56"><Group Address="1" TagName="Skip"/></Application></Network>
    </Project>`;
    const r = await make().parseXML(xml, { network: '254' });
    expect(r.labels).toEqual({ '254/56/1': 'Keep' });
    expect(r.stats.networkCount).toBe(1);
  });

  it('resolves addresses from NetworkNumber and lowercase element variants', async () => {
    const xml = `<project>
      <network><NetworkNumber>254</NetworkNumber>
        <application><address>56</address>
          <group><GroupAddress>7</GroupAddress><Label>Patio</Label></group>
        </application>
      </network>
    </project>`;
    const r = await make().parseXML(xml);
    expect(r.labels).toEqual({ '254/56/7': 'Patio' });
  });

  it('falls back to Description for a tag name and skips untagged groups', async () => {
    const xml = `<Network Address="254"><Application Address="56">
      <Group Address="1" Description="Hallway"/>
      <Group Address="2"/>
    </Application></Network>`;
    const r = await make().parseXML(xml);
    expect(r.labels).toEqual({ '254/56/1': 'Hallway' });
    expect(r.stats.groupCount).toBe(2);
    expect(r.stats.labelCount).toBe(1);
  });

  it('skips networks and applications that have no address', async () => {
    const xml = `<Project>
      <Network TagName="No Address"><Application Address="56"><Group Address="1" TagName="X"/></Application></Network>
      <Network Address="254"><Application TagName="No App Addr"><Group Address="1" TagName="Y"/></Application></Network>
    </Project>`;
    const r = await make().parseXML(xml);
    expect(r.labels).toEqual({});
    // Only the addressed network is counted; it has no TagName so no net label.
    expect(r.networkLabels).toEqual({});
    expect(r.stats.networkCount).toBe(1);
  });

  it('returns empty results when there are no networks', async () => {
    const r = await make().parseXML('<Other><Thing/></Other>');
    expect(r.labels).toEqual({});
    expect(r.stats.networkCount).toBe(0);
  });

  it('rejects non-XML, non-zip input', async () => {
    await expect(make().parse(Buffer.from('xx'))).rejects.toThrow();
  });
});
