'use strict';

/**
 * Pure helpers for scripts/verify-release.js (M12).
 * CommonJS so Jest can require() without ESM config.
 */

function tagToVersion(tag) {
  if (!tag || typeof tag !== 'string') return '';
  return tag.replace(/^v/i, '').trim();
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requiredAssetPatterns(version) {
  const v = escapeRegex(version);
  return [
    new RegExp(`^CBus\\.Studio-${v}-universal\\.dmg$`),
    new RegExp(`^CBus\\.Studio-${v}-universal-mac\\.zip$`),
    new RegExp(`^CBus\\.Studio\\.Setup\\.${v}\\.exe$`),
    new RegExp(`^CBus\\.Studio-${v}\\.AppImage$`),
  ];
}

function parseUpdaterVersion(ymlText) {
  if (!ymlText) return null;
  const m = /^version:\s*(.+)$/m.exec(ymlText);
  if (!m) return null;
  return m[1].trim().replace(/^['"]|['"]$/g, '');
}

function parseSigningStatus(releaseBody) {
  const m =
    /This release signing status:\*?\*?\s*macOS\s+\*\*(\w+)\*\*,\s*Windows\s+\*\*(\w+)\*\*/i.exec(
      releaseBody || '',
    );
  if (!m) return { mac: 'unknown', win: 'unknown' };
  return { mac: m[1].toLowerCase(), win: m[2].toLowerCase() };
}

function missingRequiredAssets(assetNames, version) {
  const patterns = requiredAssetPatterns(version);
  return patterns
    .filter((re) => !assetNames.some((name) => re.test(name)))
    .map((re) => re.source);
}

module.exports = {
  tagToVersion,
  requiredAssetPatterns,
  parseUpdaterVersion,
  parseSigningStatus,
  missingRequiredAssets,
};
