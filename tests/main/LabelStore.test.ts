import fs from 'fs';
import os from 'os';
import path from 'path';
import { LabelStore } from '../../src/main/LabelStore';
import type { LabelImport } from '../../src/shared/types';

const sample: LabelImport = {
  source: 'home.cbz',
  networks: { '254': 'Home Net' },
  applications: { '254/56': 'Lighting' },
  groups: { '254/56/4': 'Kitchen' },
  stats: { networkCount: 1, groupCount: 1, labelCount: 1 },
};

describe('LabelStore', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cbus-labels-'));
    file = path.join(dir, 'labels.json');
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('returns null when no file exists yet', () => {
    expect(new LabelStore(file).get(null)).toBeNull();
    expect(new LabelStore(file).get('site-1')).toBeNull();
  });

  it('saves and loads a global import', () => {
    const store = new LabelStore(file);
    store.save(null, sample);
    expect(store.get(null)).toEqual(sample);
    expect(new LabelStore(file).get(null)).toEqual(sample);
  });

  it('saves and loads a site-specific import', () => {
    const store = new LabelStore(file);
    store.save('site-a', sample);
    expect(store.get('site-a')).toEqual(sample);
    expect(store.get('site-b')).toBeNull();
  });

  it('prefers a site import over the global fallback', () => {
    const store = new LabelStore(file);
    const global = { ...sample, source: 'global.xml' };
    const site = { ...sample, source: 'site.cbz', groups: { '254/56/4': 'Pantry' } };
    store.save(null, global);
    store.save('site-a', site);
    expect(store.get('site-a')).toEqual(site);
    expect(store.get('site-b')).toEqual(global);
  });

  it('removes labels when a site is deleted', () => {
    const store = new LabelStore(file);
    store.save('site-a', sample);
    store.remove('site-a');
    expect(store.get('site-a')).toBeNull();
    expect(fs.readFileSync(file, 'utf8')).not.toContain('site-a');
  });

  it('treats corrupt JSON as empty', () => {
    fs.writeFileSync(file, '{ broken');
    expect(new LabelStore(file).get(null)).toBeNull();
  });

  it('ignores invalid entries in bySite', () => {
    fs.writeFileSync(file, JSON.stringify({
      global: null,
      bySite: { ok: sample, bad: { nope: true } },
    }));
    const store = new LabelStore(file);
    expect(store.get('ok')).toEqual(sample);
    expect(store.get('bad')).toBeNull();
  });

  it('creates the parent directory if needed', () => {
    const nested = path.join(dir, 'a', 'b', 'labels.json');
    new LabelStore(nested).save(null, sample);
    expect(fs.existsSync(nested)).toBe(true);
  });

  it('remove is a no-op when the siteId does not exist', () => {
    const store = new LabelStore(file);
    store.save('site-a', sample);
    store.remove('nonexistent');
    expect(store.get('site-a')).toEqual(sample);
  });

  it('normalizeData treats null JSON value as empty', () => {
    fs.writeFileSync(file, 'null');
    expect(new LabelStore(file).get(null)).toBeNull();
  });
});
