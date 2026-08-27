import fs from 'fs';
import path from 'path';
import type { LabelExportInput, LabelExportResult, Tree } from '../shared/types';

// ES import so electron-vite bundles the CommonJS exporter into main.
import { exportLabelsXml } from '../cgate-client/cbusProjectExporter';
const AdmZip = require('adm-zip');

export function buildLabelExport(input: LabelExportInput): { xml: string; stats: LabelExportResult['stats'] } {
  const { xml, stats } = exportLabelsXml({
    tree: input.tree,
    projectName: input.projectName,
  });
  return { xml, stats };
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Flat CSV of group tags for spreadsheets / diffs. */
export function buildLabelsCsv(tree: Tree): { csv: string; stats: LabelExportResult['stats'] } {
  const rows: string[] = ['network,application,group,address,label'];
  let groupCount = 0;
  let labelCount = 0;
  let unitCount = 0;
  for (const net of tree) {
    unitCount += net.units?.length ?? 0;
    for (const app of net.applications) {
      for (const g of app.groups) {
        groupCount += 1;
        if (g.label) labelCount += 1;
        rows.push([
          csvEscape(g.network),
          csvEscape(g.application),
          csvEscape(g.group),
          csvEscape(g.address),
          csvEscape(g.label ?? ''),
        ].join(','));
      }
    }
  }
  return {
    csv: rows.join('\n') + '\n',
    stats: { networkCount: tree.length, groupCount, labelCount, unitCount },
  };
}

function defaultBasename(projectName?: string | null): string {
  const base = (projectName?.trim() || 'cbus-labels').replace(/[^\w.-]+/g, '_');
  return base || 'cbus-labels';
}

function xmlEntryName(projectName?: string | null): string {
  return `${defaultBasename(projectName)}.xml`;
}

/** Write labels to disk (.xml, .cbz, or .csv). */
export function exportLabelsToFile(filePath: string, input: LabelExportInput): LabelExportResult {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.csv') {
    const { csv, stats } = buildLabelsCsv(input.tree);
    fs.writeFileSync(filePath, csv, 'utf8');
    return { path: filePath, stats };
  }

  const { xml, stats } = buildLabelExport(input);
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
