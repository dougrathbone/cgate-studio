import fs from 'fs';
import os from 'os';
import path from 'path';
import { SiteStore } from '../../src/main/SiteStore';

describe('SiteStore', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cbus-sites-'));
    file = path.join(dir, 'sites.json');
  });
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const input = { name: 'Home', host: '10.0.0.1', commandPort: 20023, eventPort: 20025 };

  it('returns an empty list when no file exists yet', () => {
    expect(new SiteStore(file).list()).toEqual([]);
  });

  it('adds a site with a generated id and persists it', () => {
    const store = new SiteStore(file);
    const sites = store.add(input);
    expect(sites).toHaveLength(1);
    expect(sites[0]).toMatchObject(input);
    expect(typeof sites[0].id).toBe('string');
    expect(sites[0].id.length).toBeGreaterThan(0);
    expect(fs.existsSync(file)).toBe(true);
  });

  it('persists across store instances', () => {
    new SiteStore(file).add(input);
    const reloaded = new SiteStore(file).list();
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0]).toMatchObject(input);
  });

  it('supports multiple sites', () => {
    const store = new SiteStore(file);
    store.add({ ...input, name: 'Site A' });
    const sites = store.add({ ...input, name: 'Site B', host: '10.0.0.2' });
    expect(sites.map((s) => s.name)).toEqual(['Site A', 'Site B']);
  });

  it('updates an existing site while preserving its id', () => {
    const store = new SiteStore(file);
    const [created] = store.add(input);
    const updated = store.update({ ...created, name: 'Renamed', eventPort: 30000 });
    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe(created.id);
    expect(updated[0].name).toBe('Renamed');
    expect(updated[0].eventPort).toBe(30000);
  });

  it('updates only the matching site when multiple exist', () => {
    const store = new SiteStore(file);
    const [a] = store.add({ ...input, name: 'A' });
    store.add({ ...input, name: 'B', host: '10.0.0.2' });
    const updated = store.update({ ...a, name: 'A-Renamed' });
    expect(updated).toHaveLength(2);
    expect(updated.find((s) => s.id === a.id)!.name).toBe('A-Renamed');
    expect(updated.find((s) => s.name === 'B')).toBeDefined();
  });

  it('removes a site by id', () => {
    const store = new SiteStore(file);
    const [a] = store.add({ ...input, name: 'A' });
    store.add({ ...input, name: 'B' });
    const after = store.remove(a.id);
    expect(after).toHaveLength(1);
    expect(after[0].name).toBe('B');
  });

  it('coerces port types on add', () => {
    const store = new SiteStore(file);
    const [s] = store.add({ name: 'x', host: 'h', commandPort: '20023' as any, eventPort: '20025' as any });
    expect(s.commandPort).toBe(20023);
    expect(s.eventPort).toBe(20025);
  });

  it('treats a corrupt file as an empty list', () => {
    fs.writeFileSync(file, 'not json{');
    expect(new SiteStore(file).list()).toEqual([]);
  });

  it('ignores non-array JSON and invalid entries', () => {
    fs.writeFileSync(file, JSON.stringify({ not: 'an array' }));
    expect(new SiteStore(file).list()).toEqual([]);
    fs.writeFileSync(file, JSON.stringify([{ id: '1', name: 'ok', host: 'h', commandPort: 1, eventPort: 2 }, { bogus: true }]));
    expect(new SiteStore(file).list()).toHaveLength(1);
  });

  it('creates the parent directory if needed', () => {
    const nested = path.join(dir, 'a', 'b', 'sites.json');
    const store = new SiteStore(nested);
    store.add(input);
    expect(fs.existsSync(nested)).toBe(true);
  });
});
