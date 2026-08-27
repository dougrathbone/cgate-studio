import fs from 'fs';
import path from 'path';
import type { LabelImport } from '../shared/types';

// ES import (not require) so electron-vite inlines the CommonJS parser into
// the main bundle. This parser is Studio-local (network/application labels).
import CbusProjectParser from '../cgate-client/cbusProjectParser';

interface RawResult {
  labels: Record<string, string>;
  applicationLabels: Record<string, string>;
  networkLabels: Record<string, string>;
  stats: { networkCount: number; groupCount: number; labelCount: number };
  source: string;
}

function toLabelImport(r: RawResult, filename: string): LabelImport {
  return {
    source: r.source || filename,
    networks: r.networkLabels,
    applications: r.applicationLabels,
    groups: r.labels,
    stats: r.stats,
  };
}

// Parse a project file's bytes (.cbz archive or raw .xml) into a LabelImport.
export async function importLabelsFromBuffer(buffer: Buffer, filename = ''): Promise<LabelImport> {
  // The parser is plain JS; its inferred shape is too narrow, so treat
  // the instance as untyped and re-type its result via RawResult.
  const parser: any = new CbusProjectParser();
  const result: RawResult = await parser.parse(buffer, filename);
  return toLabelImport(result, filename);
}

// Read a project file from disk and parse it. Throws on unreadable/invalid files
// so the caller (IPC) can surface the message to the renderer.
export async function importLabelsFromFile(filePath: string): Promise<LabelImport> {
  const buffer = fs.readFileSync(filePath);
  return importLabelsFromBuffer(buffer, path.basename(filePath));
}
