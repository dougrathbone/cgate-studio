import fs from 'fs';
import path from 'path';
import {
  APP_NAME,
  GITHUB_REPO_URL,
  GITHUB_RELEASES_URL,
  GITHUB_ISSUES_URL,
  readLicenseText,
  openGitHubRepo,
  openGitHubReleases,
  openGitHubIssues,
  configureAboutPanel,
  showLicenseDialog,
  showAbout,
  buildAppMenuTemplate,
} from '../../src/main/about';

const showMessageBox = jest.fn().mockResolvedValue({ response: 0 });
const openExternal = jest.fn().mockResolvedValue(undefined);
const setAboutPanelOptions = jest.fn();
const showAboutPanel = jest.fn();
const getVersion = jest.fn(() => '1.3.0');

jest.mock('electron', () => ({
  app: {
    getAppPath: () => '/app',
    getVersion: () => getVersion(),
    setAboutPanelOptions: (...args: unknown[]) => setAboutPanelOptions(...args),
    showAboutPanel: () => showAboutPanel(),
  },
  dialog: {
    showMessageBox: (...args: unknown[]) => showMessageBox(...args),
  },
  shell: {
    openExternal: (...args: unknown[]) => openExternal(...args),
  },
}));

describe('about', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    showMessageBox.mockClear();
    openExternal.mockClear();
    setAboutPanelOptions.mockClear();
    showAboutPanel.mockClear();
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  it('points at the canonical GitHub repository pages', () => {
    expect(GITHUB_REPO_URL).toBe('https://github.com/dougrathbone/cgate-studio');
    expect(GITHUB_RELEASES_URL).toBe('https://github.com/dougrathbone/cgate-studio/releases');
    expect(GITHUB_ISSUES_URL).toBe('https://github.com/dougrathbone/cgate-studio/issues');
    expect(APP_NAME).toBe('CBus Studio');
  });

  it('readLicenseText loads LICENSE from the repository root', () => {
    const expected = fs.readFileSync(path.join(__dirname, '../../LICENSE'), 'utf8').trim();
    expect(readLicenseText()).toBe(expected);
    expect(readLicenseText()).toContain('ISC License');
  });

  it('readLicenseText falls back when no LICENSE file is readable', () => {
    const spy = jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('missing');
    });
    expect(readLicenseText()).toContain('ISC License');
    spy.mockRestore();
  });

  it('openGitHub helpers open the matching URLs', () => {
    openGitHubRepo();
    openGitHubReleases();
    openGitHubIssues();
    expect(openExternal).toHaveBeenCalledWith(GITHUB_REPO_URL);
    expect(openExternal).toHaveBeenCalledWith(GITHUB_RELEASES_URL);
    expect(openExternal).toHaveBeenCalledWith(GITHUB_ISSUES_URL);
  });

  it('configureAboutPanel includes repository, releases, and issues in credits', () => {
    configureAboutPanel();
    expect(setAboutPanelOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationName: APP_NAME,
        applicationVersion: '1.3.0',
        website: GITHUB_REPO_URL,
        credits: expect.stringContaining(GITHUB_RELEASES_URL),
      }),
    );
    const { credits } = setAboutPanelOptions.mock.calls[0][0];
    expect(credits).toContain(GITHUB_ISSUES_URL);
  });

  it('showLicenseDialog uses a parent window when provided and opens GitHub on button 1', async () => {
    showMessageBox.mockResolvedValueOnce({ response: 1 });
    const parent = { id: 1 } as any;
    showLicenseDialog(parent);
    expect(showMessageBox).toHaveBeenCalledWith(
      parent,
      expect.objectContaining({
        title: 'License',
        buttons: ['OK', 'GitHub Repository'],
      }),
    );
    await Promise.resolve();
    expect(openExternal).toHaveBeenCalledWith(GITHUB_REPO_URL);
  });

  it('showLicenseDialog without a parent still shows the box', async () => {
    showMessageBox.mockResolvedValueOnce({ response: 0 });
    showLicenseDialog();
    expect(showMessageBox).toHaveBeenCalledWith(expect.objectContaining({ title: 'License' }));
    await Promise.resolve();
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('showAbout offers GitHub actions on every platform', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    showMessageBox.mockResolvedValueOnce({ response: 2 });
    showAbout();
    expect(showAboutPanel).not.toHaveBeenCalled();
    expect(showMessageBox).toHaveBeenCalledWith(
      expect.objectContaining({
        title: `About ${APP_NAME}`,
        buttons: ['OK', 'GitHub Repository', 'Releases', 'Report Issue', 'License…'],
      }),
    );
    await Promise.resolve();
    expect(openExternal).toHaveBeenCalledWith(GITHUB_RELEASES_URL);
  });

  it('showAbout can open issues or the license dialog from buttons', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    showMessageBox.mockResolvedValueOnce({ response: 3 });
    showAbout();
    await Promise.resolve();
    expect(openExternal).toHaveBeenCalledWith(GITHUB_ISSUES_URL);

    showMessageBox.mockResolvedValueOnce({ response: 4 });
    const parent = { id: 2 } as any;
    showAbout(parent);
    await Promise.resolve();
    expect(showMessageBox).toHaveBeenCalledWith(
      parent,
      expect.objectContaining({ title: 'License' }),
    );
  });

  it('buildAppMenuTemplate on Windows includes Help GitHub actions and updates', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    const win = { id: 9 } as any;
    const onCheckForUpdates = jest.fn();
    const template = buildAppMenuTemplate(() => win, { onCheckForUpdates });
    const help = template.find((item) => item.label === 'Help');
    expect(help).toBeDefined();
    const submenu = help!.submenu as Array<{ label?: string; click?: () => void; type?: string }>;
    const labels = submenu.map((i) => i.label).filter(Boolean);
    expect(labels).toEqual(
      expect.arrayContaining([
        `About ${APP_NAME}`,
        'Check for Updates…',
        'GitHub Repository',
        'Releases',
        'Report an Issue',
        'License…',
      ]),
    );
    submenu.find((i) => i.label === `About ${APP_NAME}`)?.click?.();
    submenu.find((i) => i.label === 'GitHub Repository')?.click?.();
    submenu.find((i) => i.label === 'Releases')?.click?.();
    submenu.find((i) => i.label === 'Report an Issue')?.click?.();
    submenu.find((i) => i.label === 'License…')?.click?.();
    submenu.find((i) => i.label === 'Check for Updates…')?.click?.();
    expect(showMessageBox).toHaveBeenCalled();
    expect(openExternal).toHaveBeenCalledWith(GITHUB_REPO_URL);
    expect(openExternal).toHaveBeenCalledWith(GITHUB_RELEASES_URL);
    expect(openExternal).toHaveBeenCalledWith(GITHUB_ISSUES_URL);
    expect(onCheckForUpdates).toHaveBeenCalled();
  });

  it('buildAppMenuTemplate on macOS prepends the app menu with GitHub actions', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    const template = buildAppMenuTemplate(() => null);
    expect(template[0].label).toBe(APP_NAME);
    const submenu = template[0].submenu as Array<{ label?: string; click?: () => void }>;
    submenu.find((i) => i.label === 'GitHub Repository')?.click?.();
    submenu.find((i) => i.label === 'Releases')?.click?.();
    submenu.find((i) => i.label === 'Report an Issue')?.click?.();
    submenu.find((i) => i.label === 'License…')?.click?.();
    expect(openExternal).toHaveBeenCalledWith(GITHUB_REPO_URL);
    expect(openExternal).toHaveBeenCalledWith(GITHUB_RELEASES_URL);
    expect(openExternal).toHaveBeenCalledWith(GITHUB_ISSUES_URL);
    expect(showMessageBox).toHaveBeenCalled();
  });
});
