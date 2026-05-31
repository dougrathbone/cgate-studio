import fs from 'fs';
import path from 'path';
import type { LabelImport } from '../shared/types';

interface LabelStoreData {
  /** Labels imported while no site was selected — used as a fallback. */
  global: LabelImport | null;
  /** Labels imported while connected to a specific saved site. */
  bySite: Record<string, LabelImport>;
}

// Persists imported project labels (display-only overlays) in userData as JSON.
// Labels are keyed by saved site id so each C-Gate location keeps its own import;
// a global fallback applies when a site has no dedicated import yet.
export class LabelStore {
  constructor(private readonly filePath: string) {}

  /** Site-specific import, falling back to the global import. */
  get(siteId: string | null): LabelImport | null {
    const data = this.read();
    if (siteId && data.bySite[siteId]) return data.bySite[siteId];
    return data.global;
  }

  save(siteId: string | null, labels: LabelImport): void {
    const data = this.read();
    const clean = sanitize(labels);
    if (siteId) data.bySite[siteId] = clean;
    else data.global = clean;
    this.write(data);
  }

  remove(siteId: string): void {
    const data = this.read();
    if (!data.bySite[siteId]) return;
    delete data.bySite[siteId];
    this.write(data);
  }

  private read(): LabelStoreData {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      return normalizeData(parsed);
    } catch {
      return { global: null, bySite: {} };
    }
  }

  private write(data: LabelStoreData): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, this.filePath);
  }
}

function normalizeData(raw: unknown): LabelStoreData {
  if (!raw || typeof raw !== 'object') return { global: null, bySite: {} };
  const obj = raw as Partial<LabelStoreData>;
  const bySite: Record<string, LabelImport> = {};
  if (obj.bySite && typeof obj.bySite === 'object') {
    for (const [id, val] of Object.entries(obj.bySite)) {
      if (isLabelImport(val)) bySite[id] = sanitize(val);
    }
  }
  return {
    global: isLabelImport(obj.global) ? sanitize(obj.global) : null,
    bySite,
  };
}

function sanitize(imp: LabelImport): LabelImport {
  return {
    source: String(imp.source ?? ''),
    networks: recordOfStrings(imp.networks),
    applications: recordOfStrings(imp.applications),
    groups: recordOfStrings(imp.groups),
    stats: {
      networkCount: num(imp.stats?.networkCount),
      groupCount: num(imp.stats?.groupCount),
      labelCount: num(imp.stats?.labelCount),
    },
  };
}

function recordOfStrings(v: unknown): Record<string, string> {
  if (!v || typeof v !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'string' && val.trim()) out[k] = val.trim();
  }
  return out;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function isLabelImport(v: unknown): v is LabelImport {
  if (!v || typeof v !== 'object') return false;
  const imp = v as Partial<LabelImport>;
  return (
    typeof imp.source === 'string' &&
    imp.networks != null &&
    typeof imp.networks === 'object' &&
    imp.applications != null &&
    typeof imp.applications === 'object' &&
    imp.groups != null &&
    typeof imp.groups === 'object' &&
    imp.stats != null &&
    typeof imp.stats === 'object'
  );
}
