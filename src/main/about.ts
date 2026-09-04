import fs from 'fs';
import path from 'path';
import { app, dialog, shell, type BrowserWindow, type MenuItemConstructorOptions } from 'electron';

export const APP_NAME = 'CBus Studio';
export const GITHUB_REPO_URL = 'https://github.com/dougrathbone/cgate-studio';
export const GITHUB_RELEASES_URL = `${GITHUB_REPO_URL}/releases`;
export const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;

const LICENSE_FALLBACK =
  'ISC License — see the project repository for the full license text.';

/** Resolve LICENSE from packaged resources, app path, or repo root (dev). */
export function readLicenseText(): string {
  const candidates = [
    process.resourcesPath ? path.join(process.resourcesPath, 'LICENSE') : null,
    path.join(process.cwd(), 'LICENSE'),
    path.join(__dirname, '../../LICENSE'),
    path.join(__dirname, '../../../LICENSE'),
  ].filter((p): p is string => !!p);
  for (const file of candidates) {
    try {
      return fs.readFileSync(file, 'utf8').trim();
    } catch {
      /* try next path */
    }
  }
  return LICENSE_FALLBACK;
}

export function openExternal(url: string): void {
  void shell.openExternal(url);
}

export function openGitHubRepo(): void {
  openExternal(GITHUB_REPO_URL);
}

export function openGitHubReleases(): void {
  openExternal(GITHUB_RELEASES_URL);
}

export function openGitHubIssues(): void {
  openExternal(GITHUB_ISSUES_URL);
}

export function configureAboutPanel(): void {
  app.setAboutPanelOptions({
    applicationName: APP_NAME,
    applicationVersion: app.getVersion(),
    version: app.getVersion(),
    copyright: 'Copyright © 2026 Doug Rathbone',
    website: GITHUB_REPO_URL,
    credits: [
      'Open source software licensed under the ISC License.',
      '',
      `Repository: ${GITHUB_REPO_URL}`,
      `Releases: ${GITHUB_RELEASES_URL}`,
      `Issues: ${GITHUB_ISSUES_URL}`,
    ].join('\n'),
  });
}

export function showLicenseDialog(parent?: BrowserWindow | null): void {
  const opts = {
    type: 'info' as const,
    title: 'License',
    message: `${APP_NAME} — ISC License`,
    detail: readLicenseText(),
    buttons: ['OK', 'GitHub Repository'],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  };
  const promise = parent
    ? dialog.showMessageBox(parent, opts)
    : dialog.showMessageBox(opts);
  void promise.then(({ response }) => {
    if (response === 1) openGitHubRepo();
  });
}

/** Custom About dialog with GitHub actions (used by Help on all platforms). */
export function showAbout(parent?: BrowserWindow | null): void {
  const opts = {
    type: 'info' as const,
    title: `About ${APP_NAME}`,
    message: `${APP_NAME} ${app.getVersion()}`,
    detail: [
      'Browse, test, and organize a Clipsal C-Bus network via an existing C-Gate server.',
      '',
      GITHUB_REPO_URL,
      '',
      'Licensed under the ISC License.',
    ].join('\n'),
    buttons: ['OK', 'GitHub Repository', 'Releases', 'Report Issue', 'License…'],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  };
  const promise = parent
    ? dialog.showMessageBox(parent, opts)
    : dialog.showMessageBox(opts);
  void promise.then(({ response }) => {
    if (response === 1) openGitHubRepo();
    if (response === 2) openGitHubReleases();
    if (response === 3) openGitHubIssues();
    if (response === 4) showLicenseDialog(parent);
  });
}

function githubHelpItems(): MenuItemConstructorOptions[] {
  return [
    { label: 'GitHub Repository', click: () => openGitHubRepo() },
    { label: 'Releases', click: () => openGitHubReleases() },
    { label: 'Report an Issue', click: () => openGitHubIssues() },
  ];
}

function helpSubmenu(
  getWindow: () => BrowserWindow | null,
  onCheckForUpdates?: () => void,
): MenuItemConstructorOptions[] {
  return [
    {
      label: `About ${APP_NAME}`,
      click: () => showAbout(getWindow()),
    },
    { type: 'separator' },
    {
      label: 'Check for Updates…',
      click: () => onCheckForUpdates?.(),
    },
    { type: 'separator' },
    ...githubHelpItems(),
    { type: 'separator' },
    {
      label: 'License…',
      click: () => showLicenseDialog(getWindow()),
    },
  ];
}

/** macOS application menu with About, GitHub, and license entries. */
function macAppMenu(
  getWindow: () => BrowserWindow | null,
  onCheckForUpdates?: () => void,
): MenuItemConstructorOptions {
  return {
    label: APP_NAME,
    submenu: [
      { role: 'about' },
      {
        label: 'Check for Updates…',
        click: () => onCheckForUpdates?.(),
      },
      { type: 'separator' },
      ...githubHelpItems(),
      { label: 'License…', click: () => showLicenseDialog(getWindow()) },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  };
}

export function buildAppMenuTemplate(
  getWindow: () => BrowserWindow | null,
  updateActions?: { onCheckForUpdates?: () => void },
): MenuItemConstructorOptions[] {
  const isMac = process.platform === 'darwin';
  const onCheckForUpdates = updateActions?.onCheckForUpdates;
  return [
    ...(isMac ? [macAppMenu(getWindow, onCheckForUpdates)] : []),
    { role: 'fileMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    {
      label: 'Help',
      role: !isMac ? 'help' as const : undefined,
      submenu: helpSubmenu(getWindow, onCheckForUpdates),
    },
  ];
}
