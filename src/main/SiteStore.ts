import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { Site, SiteInput } from '../shared/types';

// Persists the list of saved C-Gate sites as JSON in the Electron userData
// directory. All access is synchronous: the data is tiny and reads/writes only
// happen in response to explicit IPC calls from the renderer, never on a hot
// path. Writes are atomic (write-temp-then-rename) so a crash mid-write can't
// corrupt the existing file.
export class SiteStore {
  constructor(private readonly filePath: string) {}

  list(): Site[] {
    return this.read();
  }

  add(input: SiteInput): Site[] {
    const sites = this.read();
    sites.push({ id: crypto.randomUUID(), ...sanitize(input) });
    this.write(sites);
    return sites;
  }

  update(updated: Site): Site[] {
    const sites = this.read().map((s) =>
      s.id === updated.id ? { ...sanitize(updated), id: s.id } : s,
    );
    this.write(sites);
    return sites;
  }

  remove(id: string): Site[] {
    const sites = this.read().filter((s) => s.id !== id);
    this.write(sites);
    return sites;
  }

  private read(): Site[] {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isSite);
    } catch {
      // Missing file (first run) or unreadable/corrupt JSON: start empty rather
      // than crashing the main process.
      return [];
    }
  }

  private write(sites: Site[]): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(sites, null, 2), 'utf8');
    fs.renameSync(tmp, this.filePath);
  }
}

function sanitize(s: SiteInput | Site): SiteInput {
  return {
    name: String(s.name),
    host: String(s.host),
    commandPort: Number(s.commandPort),
    eventPort: Number(s.eventPort),
  };
}

function isSite(v: unknown): v is Site {
  const s = v as Partial<Site>;
  return (
    !!s &&
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    typeof s.host === 'string' &&
    typeof s.commandPort === 'number' &&
    typeof s.eventPort === 'number'
  );
}
