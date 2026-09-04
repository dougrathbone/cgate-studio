#!/usr/bin/env node
'use strict';

/**
 * Verify a GitHub Release has the expected CBus Studio installers and
 * electron-updater metadata (M12). Signing absence is a warning, not a failure.
 *
 * Usage:
 *   node scripts/verify-release.js [tag]
 *   npm run verify-release -- v1.3.2
 *   npm run verify-release -- v1.3.2 --check-codesign
 */

const { spawnSync } = require('child_process');
const {
  tagToVersion,
  parseUpdaterVersion,
  parseSigningStatus,
  missingRequiredAssets,
} = require('./lib/releaseVerify');

const REPO = 'dougrathbone/cgate-studio';
const UPDATER_FILES = ['latest-mac.yml', 'latest.yml', 'latest-linux.yml'];

function usage() {
  console.error('Usage: node scripts/verify-release.js [tag] [--check-codesign]');
  process.exit(2);
}

function ghJson(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || 'gh failed').trim());
  }
  return JSON.parse(r.stdout);
}

function ghText(args) {
  const r = spawnSync('gh', args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  if (r.status !== 0) {
    throw new Error((r.stderr || r.stdout || 'gh failed').trim());
  }
  return r.stdout;
}

function resolveTag(cliTag) {
  if (cliTag) return cliTag.startsWith('v') ? cliTag : `v${cliTag}`;
  const latest = ghJson(['release', 'view', '--repo', REPO, '--json', 'tagName']);
  return latest.tagName;
}

function downloadAssetText(tag, assetName) {
  const release = ghJson([
    'release',
    'view',
    tag,
    '--repo',
    REPO,
    '--json',
    'assets',
  ]);
  const asset = (release.assets || []).find((a) => a.name === assetName);
  if (!asset) return null;
  // softprops / gh release JSON: `url` is the API asset URL
  const apiUrl = asset.url;
  if (!apiUrl) return null;
  const pathPart = apiUrl.replace(/^https:\/\/api\.github\.com\//, '');
  return ghText(['api', '-H', 'Accept: application/octet-stream', pathPart]);
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--');
  const checkCodesign = args.includes('--check-codesign');
  const positional = args.filter((a) => !a.startsWith('--'));
  if (positional.length > 1) usage();

  let tag;
  try {
    tag = resolveTag(positional[0]);
  } catch (e) {
    console.error('Failed to resolve release tag:', e.message);
    process.exit(1);
  }

  const version = tagToVersion(tag);
  console.log(`Verifying ${tag} (version ${version}) on ${REPO}…`);

  let release;
  try {
    release = ghJson([
      'release',
      'view',
      tag,
      '--repo',
      REPO,
      '--json',
      'assets,body,tagName',
    ]);
  } catch (e) {
    console.error('Failed to load release:', e.message);
    process.exit(1);
  }

  const assetNames = (release.assets || []).map((a) => a.name);
  const missing = missingRequiredAssets(assetNames, version);
  let failed = false;

  if (missing.length) {
    failed = true;
    console.error('FAIL: missing required installer assets matching:');
    for (const m of missing) console.error('  -', m);
  } else {
    console.log('OK: required installers present (dmg, mac.zip, exe, AppImage)');
  }

  for (const name of UPDATER_FILES) {
    if (!assetNames.includes(name)) {
      failed = true;
      console.error(`FAIL: missing updater file ${name}`);
      continue;
    }
    let yml;
    try {
      yml = downloadAssetText(tag, name);
    } catch (e) {
      failed = true;
      console.error(`FAIL: could not download ${name}:`, e.message);
      continue;
    }
    const ver = parseUpdaterVersion(yml || '');
    if (ver !== version) {
      failed = true;
      console.error(`FAIL: ${name} version is ${ver ?? '(none)'}, expected ${version}`);
    } else {
      console.log(`OK: ${name} version=${ver}`);
    }
  }

  const signing = parseSigningStatus(release.body || '');
  if (signing.mac === 'signed' && signing.win === 'signed') {
    console.log('OK: release body reports macOS and Windows signed');
  } else {
    console.warn(
      `WARN: signing status mac=${signing.mac} win=${signing.win} (unsigned/unknown is expected until secrets exist)`,
    );
  }

  if (checkCodesign) {
    if (process.platform !== 'darwin') {
      console.warn('WARN: --check-codesign skipped (not macOS)');
    } else {
      const dmgName = assetNames.find((n) => n.endsWith('.dmg') && n.includes(version));
      if (!dmgName) {
        console.warn('WARN: --check-codesign: no .dmg asset found');
      } else {
        console.log(
          `HINT: download ${dmgName} and run: codesign -dv --verbose=4 "/path/to/CBus Studio.app"`,
        );
        console.log('HINT: spctl --assess --type execute "/path/to/CBus Studio.app"');
      }
    }
  }

  if (failed) {
    console.error('verify-release: FAILED');
    process.exit(1);
  }
  console.log('verify-release: PASSED');
}

main();
