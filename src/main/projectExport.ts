import fs from 'fs';
import path from 'path';
import type { LabelExportInput, LabelExportResult, Tree } from '../shared/types';

// ES import so electron-vite bundles the vendored CommonJS exporter into main.
import { exportLabelsXml } from '../cgate-client/cbusProjectExporter';
const AdmZip = require('adm-zip');

export function buildLabelExport(input: LabelExportInput): { xml: string; stats: LabelExportResult['stats'] } {
  const { xml, stats } = exportLabelsXml({
    tree: input.tree,
    projectName: input.projectName,
  });
  return { xml, stats };
}

function defaultBasename(projectName?: string | null): string {
  const base = (projectName?.trim() || 'cbus-labels').replace(/[^\w.-]+/g, '_');
  return base || 'cbus-labels';
}

function xmlEntryName(projectName?: string | null): string {
  return `${defaultBasename(projectName)}.xml`;
}

/** Write a Toolkit-compatible label export to disk (.xml or .cbz). */
export function exportLabelsToFile(filePath: string, input: LabelExportInput): LabelExportResult {
  const { xml, stats } = buildLabelExport(input);
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.cbz') {
    const zip = new AdmZip();
    zip.addFile(xmlEntryName(input.projectName), Buffer.from(xml, 'utf8'));
    zip.writeZip(filePath);
  } else {
    fs.writeFileSync(filePath, xml, 'utf8');
  }

  return { path: filePath, stats };
}

/** Convenience for tests: export a tree to XML without touching disk. */
export function exportLabelsFromTree(tree: Tree, projectName?: string | null): string {
  return buildLabelExport({ tree, projectName }).xml;
}
