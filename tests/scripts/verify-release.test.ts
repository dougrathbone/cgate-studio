const {
  tagToVersion,
  requiredAssetPatterns,
  parseUpdaterVersion,
  parseSigningStatus,
  missingRequiredAssets,
} = require('../../scripts/lib/releaseVerify');

describe('releaseVerify helpers (M12)', () => {
  it('tagToVersion strips leading v', () => {
    expect(tagToVersion('v1.3.2')).toBe('1.3.2');
    expect(tagToVersion('1.3.2')).toBe('1.3.2');
    expect(tagToVersion('')).toBe('');
  });

  it('requiredAssetPatterns match real v1.3.2 asset names', () => {
    const names = [
      'CBus.Studio-1.3.2-universal.dmg',
      'CBus.Studio-1.3.2-universal-mac.zip',
      'CBus.Studio.Setup.1.3.2.exe',
      'CBus.Studio-1.3.2.AppImage',
    ];
    const patterns = requiredAssetPatterns('1.3.2');
    expect(patterns).toHaveLength(4);
    for (const re of patterns) {
      expect(names.some((n) => re.test(n))).toBe(true);
    }
    expect(missingRequiredAssets(names, '1.3.2')).toEqual([]);
  });

  it('missingRequiredAssets reports absent installers', () => {
    const missing = missingRequiredAssets(
      ['CBus.Studio-1.3.2-universal.dmg', 'latest-mac.yml'],
      '1.3.2',
    );
    expect(missing.length).toBe(3);
  });

  it('parseUpdaterVersion reads electron-builder latest.yml', () => {
    expect(parseUpdaterVersion("version: 1.3.2\npath: foo\n")).toBe('1.3.2');
    expect(parseUpdaterVersion("version: '1.3.2'\n")).toBe('1.3.2');
    expect(parseUpdaterVersion('nope')).toBeNull();
  });

  it('parseSigningStatus reads release body or unknown', () => {
    expect(
      parseSigningStatus(
        '**This release signing status:** macOS **unsigned**, Windows **unsigned**, Linux n/a.',
      ),
    ).toEqual({ mac: 'unsigned', win: 'unsigned' });
    expect(parseSigningStatus('')).toEqual({ mac: 'unknown', win: 'unknown' });
  });
});
