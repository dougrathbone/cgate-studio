import fs from 'fs';
import os from 'os';
import path from 'path';
import { exportLabelsToFile, exportLabelsFromTree, buildLabelExport, buildLabelsCsv, buildInventoryCsv, exportInventoryToFile } from '../src/main/projectExport';
import { importLabelsFromBuffer } from '../src/main/projectImport';
const AdmZip = require('adm-zip');

const tree = [
  {
    kind: 'network' as const,
    address: '254',
    label: 'Home',
    applications: [
      {
        kind: 'application' as const,
        address: '56',
        label: 'Lighting',
        groups: [
          {
            kind: 'group' as const,
            address: '254/56/4',
            network: '254',
            application: '56',
            group: '4',
            label: 'Kitchen',
          },
        ],
      },
    ],
    units: [
      {
        kind: 'unit' as const,
        address: '2',
        name: 'DIMMER',
        type: 'DIMDC8',
        category: 'Dimmer',
        firmware: null,
        serial: null,
        applications: ['56'],
        groups: ['4'],
      },
    ],
  },
];

describe('projectExport', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('buildLabelExport returns xml and stats', () => {
    const { xml, stats } = buildLabelExport({ tree, projectName: 'MYPROJ' });
    expect(xml).toContain('<TagName>MYPROJ</TagName>');
    expect(xml).toContain('<TagName>Kitchen</TagName>');
    expect(stats).toEqual({ networkCount: 1, groupCount: 1, labelCount: 1, unitCount: 1 });
  });

  it('buildLabelsCsv escapes commas/quotes and counts unlabelled groups', () => {
    const messy = [{
      ...tree[0],
      units: [] as typeof tree[0]['units'],
      applications: [{
        ...tree[0].applications[0],
        groups: [
          { ...tree[0].applications[0].groups[0], label: 'Hall, "Main"' },
          {
            kind: 'group' as const,
            address: '254/56/5',
            network: '254',
            application: '56',
            group: '5',
            label: null,
          },
        ],
      }],
    }];
    const { csv, stats } = buildLabelsCsv(messy as typeof tree);
    expect(csv).toContain('"Hall, ""Main"""');
    expect(stats.groupCount).toBe(2);
    expect(stats.labelCount).toBe(1);
    expect(stats.unitCount).toBe(0);
  });

  it('buildLabelsCsv returns a header and group rows', () => {
    const { csv, stats } = buildLabelsCsv(tree);
    expect(csv).toContain('network,application,group,address,label');
    expect(csv).toContain('254,56,4,254/56/4,Kitchen');
    expect(stats).toEqual({ networkCount: 1, groupCount: 1, labelCount: 1, unitCount: 1 });
  });

  it('buildInventoryCsv returns unit identity columns', () => {
    const { csv, stats } = buildInventoryCsv(tree);
    expect(csv).toContain('network,address,type,typeLabel,serial,firmware,name');
    expect(csv).toContain('254,2,DIMDC8,Dimmer (DIMDC8)');
    expect(csv).toContain('DIMMER');
    expect(stats.unitCount).toBe(1);
  });

  it('exportInventoryToFile writes CSV to disk', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cbus-inv-'));
    const file = path.join(dir, 'inv.csv');
    try {
      const result = exportInventoryToFile(file, { tree, projectName: 'HOME' });
      expect(result.path).toBe(file);
      expect(fs.readFileSync(file, 'utf8')).toContain('typeLabel');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('exportLabelsToFile writes csv when extension is .csv', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cbus-csv-'));
    const file = path.join(dir, 'tags.csv');
    const result = exportLabelsToFile(file, { tree, projectName: 'MYPROJ' });
    expect(result.path).toBe(file);
    expect(fs.readFileSync(file, 'utf8')).toContain('Kitchen');
  });

  it('exportLabelsFromTree returns xml without writing disk', () => {
    const xml = exportLabelsFromTree(tree, 'TEST');
    expect(xml).toContain('<Installation>');
    expect(xml).toContain('<TagName>TEST</TagName>');
  });

  it('exportLabelsFromTree handles null and empty project name without throwing', () => {
    const xmlNull = exportLabelsFromTree(tree, null);
    expect(xmlNull).toContain('<Installation>');
    // Verify null projectName does NOT include a Project TagName (falls back to no name, not 'cbus-labels')
    expect(xmlNull).not.toContain('<TagName>cbus-labels</TagName>');
    const xmlEmpty = exportLabelsFromTree(tree, '');
    expect(xmlEmpty).toContain('<Installation>');
    // Verify empty projectName does NOT include a Project TagName (falls back to no name, not 'cbus-labels')
    expect(xmlEmpty).not.toContain('<TagName>cbus-labels</TagName>');
  });

  it('writes a .cbz with default basename when project name is null or empty', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cbus-export-'));
    try {
      // null projectName falls back to 'cbus-labels.xml' inside the archive
      const fileNull = path.join(dir, 'out-null.cbz');
      exportLabelsToFile(fileNull, { tree, projectName: null });
      const zipNull = new AdmZip(fileNull);
      const entryNull = zipNull.getEntries().find((e: { entryName: string }) => e.entryName.endsWith('.xml'));
      expect(entryNull).toBeDefined();
      expect(entryNull?.entryName).toBe('cbus-labels.xml');

      // empty projectName also falls back
      const fileEmpty = path.join(dir, 'out-empty.cbz');
      exportLabelsToFile(fileEmpty, { tree, projectName: '' });
      const zipEmpty = new AdmZip(fileEmpty);
      const entryEmpty = zipEmpty.getEntries().find((e: { entryName: string }) => e.entryName.endsWith('.xml'));
      expect(entryEmpty).toBeDefined();
      expect(entryEmpty?.entryName).toBe('cbus-labels.xml');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes a .xml file and round-trips labels on re-import', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cbus-export-'));
    const file = path.join(dir, 'labels.xml');
    try {
      const result = exportLabelsToFile(file, { tree, projectName: 'EXPORT' });
      expect(result.path).toBe(file);
      expect(fs.existsSync(file)).toBe(true);
      const imp = await importLabelsFromBuffer(fs.readFileSync(file), 'labels.xml');
      expect(imp.networks['254']).toBe('Home');
      expect(imp.applications['254/56']).toBe('Lighting');
      expect(imp.groups['254/56/4']).toBe('Kitchen');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writes a .cbz archive containing a project .xml', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cbus-export-'));
    const file = path.join(dir, 'EXPORT.cbz');
    try {
      exportLabelsToFile(file, { tree, projectName: 'EXPORT' });
      const zip = new AdmZip(file);
      const entry = zip.getEntries().find((e: { entryName: string }) => e.entryName.endsWith('.xml'));
      expect(entry).toBeDefined();
      const imp = await importLabelsFromBuffer(zip.readAsText(entry!), 'EXPORT.cbz');
      expect(imp.groups['254/56/4']).toBe('Kitchen');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
