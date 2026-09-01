import fs from 'fs';
import path from 'path';

describe('M11 distribution config', () => {
  const root = path.join(__dirname, '../..');

  it('publishes GitHub updater metadata and Linux AppImage', () => {
    const yml = fs.readFileSync(path.join(root, 'electron-builder.yml'), 'utf8');
    expect(yml).toContain('provider: github');
    expect(yml).toContain('repo: cgate-studio');
    expect(yml).toContain('AppImage');
    expect(yml).toContain('entitlements.mac.plist');
    expect(yml).not.toMatch(/identity:\s*null/);
  });

  it('release workflow signs when secrets exist and still publishes updater files', () => {
    const yml = fs.readFileSync(path.join(root, '.github/workflows/release.yml'), 'utf8');
    expect(yml).toContain('MACOS_CSC_LINK');
    expect(yml).toContain('WIN_CSC_LINK');
    expect(yml).toContain('notarize');
    expect(yml).toContain('platform: linux');
    expect(yml).toContain('*.yml');
    expect(yml).toContain('*.blockmap');
    expect(yml).toContain('*.AppImage');
  });
});
