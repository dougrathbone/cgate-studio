import fs from 'fs';
import path from 'path';
import { GITHUB_REPO_URL, readLicenseText } from '../../src/main/about';

jest.mock('electron', () => ({
  app: {
    getAppPath: () => '/app',
    getVersion: () => '1.0.0',
    setAboutPanelOptions: jest.fn(),
    showAboutPanel: jest.fn(),
  },
}));

describe('about', () => {
  it('points at the canonical GitHub repository', () => {
    expect(GITHUB_REPO_URL).toBe('https://github.com/dougrathbone/cgate-studio');
  });

  it('readLicenseText loads LICENSE from the repository root', () => {
    const expected = fs.readFileSync(path.join(__dirname, '../../LICENSE'), 'utf8').trim();
    expect(readLicenseText()).toBe(expected);
    expect(readLicenseText()).toContain('ISC License');
  });
});
