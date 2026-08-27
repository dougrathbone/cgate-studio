// Coverage of the C-Bus project exporter: Toolkit-compatible XML shape,
// sorting, escaping, units, and round-trip through cbusProjectParser.
const { parseString } = require('xml2js');
const AdmZip = require('adm-zip');
const CbusProjectParser = require('../src/cgate-client/cbusProjectParser');
const {
  exportLabelsXml,
  exportLabelsXmlAttributes,
  escapeXml,
  cmpAddress,
} = require('../src/cgate-client/cbusProjectExporter');

const sampleTree = [
  {
    kind: 'network',
    address: '254',
    label: 'Local Network',
    applications: [
      {
        kind: 'application',
        address: '203',
        label: 'Enable Control',
        groups: [
          { kind: 'group', address: '254/203/1', network: '254', application: '203', group: '1', label: 'Garage Door' },
          { kind: 'group', address: '254/203/20', network: '254', application: '203', group: '20', label: null },
        ],
      },
      {
        kind: 'application',
        address: '56',
        label: 'Lighting',
        groups: [
          { kind: 'group', address: '254/56/4', network: '254', application: '56', group: '4', label: 'Kitchen' },
          { kind: 'group', address: '254/56/5', network: '254', application: '56', group: '5', label: 'Dining' },
          { kind: 'group', address: '254/56/6', network: '254', application: '56', group: '6', label: null },
        ],
      },
    ],
    units: [
      {
        kind: 'unit',
        address: '12',
        name: 'KITCHEN DIMMER',
        type: 'DIMDC8',
        category: 'Dimmer',
        firmware: '1.0',
        serial: 'ABC',
        applications: ['56'],
        groups: ['4', '5'],
      },
      { kind: 'unit', address: '2', name: null, type: 'RELDN12', category: 'Relay', firmware: null, serial: null, applications: [], groups: [] },
    ],
  },
];

describe('cbusProjectExporter', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('escapeXml encodes special characters', () => {
    expect(escapeXml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;');
    expect(escapeXml('<tag>')).toBe('&lt;tag&gt;');
  });

  it('cmpAddress sorts numerically', () => {
    expect(['20', '3', '10'].sort(cmpAddress)).toEqual(['3', '10', '20']);
  });

  describe('exportLabelsXml (Toolkit child-element format)', () => {
    it('emits Installation > Project > Network > Application > Group hierarchy', () => {
      const { xml } = exportLabelsXml({ tree: sampleTree, projectName: '5COGAN' });
      expect(xml).toContain('<?xml version="1.0" encoding="utf-8"?>');
      expect(xml).toContain('<Installation>');
      expect(xml).toContain('<DBVersion>2.3</DBVersion>');
      expect(xml).toContain('<Version>1.0</Version>');
      expect(xml).toContain('<Project>');
      expect(xml).toContain('<TagName>5COGAN</TagName>');
      expect(xml).toContain('<Address>5COGAN</Address>');
      expect(xml).toContain('<TagName>Local Network</TagName>');
      expect(xml).toContain('<Address>254</Address>');
      expect(xml).toContain('<NetworkNumber>254</NetworkNumber>');
      expect(xml).toContain('<TagName>Lighting</TagName>');
      expect(xml).toContain('<TagName>Kitchen</TagName>');
      expect(xml).toContain('<Address>4</Address>');
    });

    it('includes units with TagName, Address, and CatalogNumber', () => {
      const { xml } = exportLabelsXml({ tree: sampleTree });
      expect(xml).toContain('<Unit>');
      expect(xml).toContain('<TagName>KITCHEN DIMMER</TagName>');
      expect(xml).toContain('<Address>12</Address>');
      expect(xml).toContain('<CatalogNumber>DIMDC8</CatalogNumber>');
      // Unit without a name still exports its address.
      expect(xml).toContain('<Address>2</Address>');
    });

    it('omits TagName on groups without labels but keeps Address', () => {
      const { xml } = exportLabelsXml({ tree: sampleTree });
      expect(xml).toMatch(/<Group>\s*\n\s*<Address>6<\/Address>\s*\n\s*<\/Group>/);
    });

    it('sorts applications and groups numerically within each application', () => {
      const { xml } = exportLabelsXml({ tree: sampleTree });
      const app56Idx = xml.indexOf('<TagName>Lighting</TagName>');
      const app203Idx = xml.indexOf('<TagName>Enable Control</TagName>');
      expect(app56Idx).toBeLessThan(app203Idx);

      const lightingBlock = xml.slice(app56Idx, app203Idx);
      expect(lightingBlock.indexOf('<Address>4</Address>')).toBeLessThan(lightingBlock.indexOf('<Address>5</Address>'));
      expect(lightingBlock.indexOf('<Address>5</Address>')).toBeLessThan(lightingBlock.indexOf('<Address>6</Address>'));

      const enableBlock = xml.slice(app203Idx, xml.indexOf('<Unit>'));
      expect(enableBlock.indexOf('<Address>1</Address>')).toBeLessThan(enableBlock.indexOf('<Address>20</Address>'));
    });

    it('escapes special characters in labels', () => {
      const tree = [{
        kind: 'network', address: '254', label: 'Tom & Jerry',
        applications: [{
          kind: 'application', address: '56', label: '"Main"',
          groups: [{ kind: 'group', address: '254/56/1', network: '254', application: '56', group: '1', label: '<Hall>' }],
        }],
        units: [],
      }];
      const { xml } = exportLabelsXml({ tree });
      expect(xml).toContain('<TagName>Tom &amp; Jerry</TagName>');
      expect(xml).toContain('<TagName>&quot;Main&quot;</TagName>');
      expect(xml).toContain('<TagName>&lt;Hall&gt;</TagName>');
    });

    it('returns accurate stats', () => {
      const { stats } = exportLabelsXml({ tree: sampleTree });
      expect(stats).toEqual({ networkCount: 1, groupCount: 5, labelCount: 3, unitCount: 2 });
    });

    it('handles an empty tree', () => {
      const { xml, stats } = exportLabelsXml({ tree: [] });
      expect(xml).toContain('<Installation>');
      expect(xml).not.toContain('<Network>');
      expect(stats).toEqual({ networkCount: 0, groupCount: 0, labelCount: 0, unitCount: 0 });
    });

    it('produces well-formed XML (parseable by xml2js)', async () => {
      const { xml } = exportLabelsXml({ tree: sampleTree, projectName: 'TEST' });
      await new Promise((resolve, reject) => {
        parseString(xml, (err: Error | null) => (err ? reject(err) : resolve(undefined)));
      });
    });

    it('round-trips group/network/application labels through cbusProjectParser', async () => {
      const { xml } = exportLabelsXml({ tree: sampleTree, projectName: '5COGAN' });
      const parser = new CbusProjectParser();
      const imported = await parser.parse(Buffer.from(xml, 'utf8'), 'roundtrip.xml');
      expect(imported.networkLabels).toEqual({ '254': 'Local Network' });
      expect(imported.applicationLabels).toEqual({
        '254/56': 'Lighting',
        '254/203': 'Enable Control',
      });
      expect(imported.labels).toEqual({
        '254/56/4': 'Kitchen',
        '254/56/5': 'Dining',
        '254/203/1': 'Garage Door',
      });
      expect(imported.stats.groupCount).toBe(5);
      expect(imported.stats.labelCount).toBe(3);
    });
  });

  describe('exportLabelsXmlAttributes (attribute format)', () => {
    it('emits Address/TagName attributes on Network/Application/Group', () => {
      const { xml } = exportLabelsXmlAttributes({ tree: sampleTree, projectName: 'HOME' });
      expect(xml).toContain('<Network Address="254" TagName="Local Network">');
      expect(xml).toContain('<Application TagName="Lighting" Address="56">');
      expect(xml).toContain('<Group TagName="Kitchen" Address="4"/>');
      expect(xml).toContain('<Group Address="6"/>');
    });

    it('round-trips through cbusProjectParser', async () => {
      const { xml } = exportLabelsXmlAttributes({ tree: sampleTree });
      const parser = new CbusProjectParser();
      const imported = await parser.parse(Buffer.from(xml, 'utf8'), 'attr.xml');
      expect(imported.labels['254/56/4']).toBe('Kitchen');
      expect(imported.networkLabels['254']).toBe('Local Network');
    });
  });
});

export {};
