import fs from 'fs';
import os from 'os';
import path from 'path';
import { importLabelsFromBuffer, importLabelsFromFile } from '../src/main/projectImport';
const AdmZip = require('adm-zip');
const CbusProjectParser = require('../src/cgate-client/cbusProjectParser');

const XML = `<?xml version="1.0"?>
<Installation>
  <Project>
    <Network Address="254" TagName="Local Network">
      <Application Address="56" TagName="Lighting">
        <Group Address="4" TagName="Kitchen"/>
        <Group Address="5" TagName="Dining"/>
        <Group Address="6"/>
      </Application>
      <Application Address="203" TagName="Enable Control">
        <Group Address="1" TagName="Garage Door"/>
      </Application>
    </Network>
  </Project>
</Installation>`;

describe('projectImport', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('imports group, application, and network labels from raw XML', async () => {
    const imp = await importLabelsFromBuffer(Buffer.from(XML, 'utf8'), 'home.xml');
    expect(imp.source).toBe('home.xml');
    expect(imp.groups).toEqual({
      '254/56/4': 'Kitchen',
      '254/56/5': 'Dining',
      '254/203/1': 'Garage Door',
    });
    expect(imp.applications).toEqual({
      '254/56': 'Lighting',
      '254/203': 'Enable Control',
    });
    expect(imp.networks).toEqual({ '254': 'Local Network' });
    expect(imp.stats).toEqual({ networkCount: 1, groupCount: 4, labelCount: 3 });
  });

  it('falls back to the given filename for source when none is embedded', async () => {
    const imp = await importLabelsFromBuffer(Buffer.from(XML, 'utf8'), '');
    expect(imp.source).toBe('');
    expect(imp.groups['254/56/4']).toBe('Kitchen');
  });

  it('imports from a .cbz (zipped XML) archive', async () => {
    const zip = new AdmZip();
    zip.addFile('5COGAN.xml', Buffer.from(XML, 'utf8'));
    const cbz = zip.toBuffer();

    const imp = await importLabelsFromBuffer(cbz, '5COGAN.cbz');
    expect(imp.source).toBe('5COGAN.cbz');
    expect(imp.groups['254/56/4']).toBe('Kitchen');
    expect(imp.networks['254']).toBe('Local Network');
  });

  it('reads and parses a project file from disk', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cbus-import-'));
    const file = path.join(dir, 'project.xml');
    fs.writeFileSync(file, XML);
    try {
      const imp = await importLabelsFromFile(file);
      expect(imp.source).toBe('project.xml');
      expect(imp.groups['254/203/1']).toBe('Garage Door');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects a .cbz that contains no XML', async () => {
    const zip = new AdmZip();
    zip.addFile('readme.txt', Buffer.from('not xml'));
    await expect(importLabelsFromBuffer(zip.toBuffer(), 'bad.cbz')).rejects.toThrow(/does not contain an XML/);
  });

  it('enforces the zip-bomb decompressed-size cap', () => {
    const parser = new CbusProjectParser({ maxDecompressedBytes: 8 });
    const zip = new AdmZip();
    zip.addFile('big.xml', Buffer.from(XML, 'utf8'));
    expect(() => (parser as any)._extractCBZ(zip.toBuffer())).toThrow(/zip-bomb/);
  });

  it('rejects unsafe zip entry names (path traversal / absolute)', () => {
    const isSafe = CbusProjectParser._isSafeZipEntryName as (n: string) => boolean;
    expect(isSafe('5COGAN.xml')).toBe(true);
    expect(isSafe('sub/dir/p.xml')).toBe(true);
    expect(isSafe('../escape.xml')).toBe(false);
    expect(isSafe('/etc/passwd')).toBe(false);
    expect(isSafe('C:\\windows\\p.xml')).toBe(false);
    expect(isSafe('')).toBe(false);
  });
});
