import fs from 'fs';
import path from 'path';
import {
  APP_NAME,
  GITHUB_REPO_URL,
  readLicenseText,
  openGitHubRepo,
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

  it('points at the canonical GitHub repository', () => {
    expect(GITHUB_REPO_URL).toBe('https://github.com/dougrathbone/cgate-studio');
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

  it('openGitHubRepo opens the repo in the default browser', () => {
    openGitHubRepo();
    expect(openExternal).toHaveBeenCalledWith(GITHUB_REPO_URL);
  });

  it('configureAboutPanel stamps version and ISC credits', () => {
    configureAboutPanel();
    expect(setAboutPanelOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationName: APP_NAME,
        applicationVersion: '1.3.0',
        website: GITHUB_REPO_URL,
        credits: expect.stringContaining('ISC'),
      }),
    );
  });

  it('showLicenseDialog uses a parent window when provided and opens GitHub on button 1', async () => {
    showMessageBox.mockResolvedValueOnce({ response: 1 });
    const parent = { id: 1 } as any;
    showLicenseDialog(parent);
    expect(showMessageBox).toHaveBeenCalledWith(parent, expect.objectContaining({ title: 'License' }));
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

  it('showAbout on macOS uses the native about panel', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    showAbout();
    expect(showAboutPanel).toHaveBeenCalled();
    expect(showMessageBox).not.toHaveBeenCalled();
  });

  it('showAbout on Windows opens GitHub or the license dialog from buttons', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    showMessageBox.mockResolvedValueOnce({ response: 1 });
    showAbout();
    expect(showMessageBox).toHaveBeenCalledWith(expect.objectContaining({
      title: `About ${APP_NAME}`,
    }));
    await Promise.resolve();
    expect(openExternal).toHaveBeenCalledWith(GITHUB_REPO_URL);

    showMessageBox.mockResolvedValueOnce({ response: 2 });
    const parent = { id: 2 } as any;
    showAbout(parent);
    await Promise.resolve();
    expect(showMessageBox).toHaveBeenCalledWith(parent, expect.objectContaining({ title: 'License' }));
  });

  it('buildAppMenuTemplate includes a Help submenu with working clicks', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    const win = { id: 9 } as any;
    const template = buildAppMenuTemplate(() => win);
    const help = template.find((item) => item.label === 'Help');
    expect(help).toBeDefined();
    const submenu = help!.submenu as Array<{ label?: string; click?: () => void; type?: string }>;
    submenu.find((i) => i.label === `About ${APP_NAME}`)?.click?.();
    submenu.find((i) => i.label === 'View on GitHub')?.click?.();
    submenu.find((i) => i.label === 'License…')?.click?.();
    expect(showMessageBox).toHaveBeenCalled();
    expect(openExternal).toHaveBeenCalled();
  });

  it('buildAppMenuTemplate on macOS prepends the app menu', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    const template = buildAppMenuTemplate(() => null);
    expect(template[0].label).toBe(APP_NAME);
    const submenu = template[0].submenu as Array<{ label?: string; click?: () => void }>;
    submenu.find((i) => i.label === 'View on GitHub')?.click?.();
    submenu.find((i) => i.label === 'License…')?.click?.();
    expect(openExternal).toHaveBeenCalled();
    expect(showMessageBox).toHaveBeenCalled();
  });
});
