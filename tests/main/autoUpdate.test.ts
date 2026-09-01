import { bindAutoUpdater, shouldCheckForUpdates, type UpdateFeed } from '../../src/main/autoUpdate';
import type { AppUpdateStatus } from '../../src/shared/types';

function fakeFeed(): UpdateFeed & { listeners: Record<string, Function[]>; fail: boolean } {
  const listeners: Record<string, Function[]> = {};
  return {
    autoDownload: false,
    listeners,
    fail: false,
    on(event, listener) {
      (listeners[event] ||= []).push(listener);
    },
    async checkForUpdates() {
      if (this.fail) throw new Error('network');
      return { updateInfo: { version: '1.4.0' } };
    },
    quitAndInstall: jest.fn(),
  };
}

describe('shouldCheckForUpdates', () => {
  it('only runs in packaged builds unless skip env is set', () => {
    expect(shouldCheckForUpdates(false)).toBe(false);
    expect(shouldCheckForUpdates(true)).toBe(true);
    expect(shouldCheckForUpdates(true, '1')).toBe(false);
    expect(shouldCheckForUpdates(true, undefined)).toBe(true);
  });
});

describe('bindAutoUpdater', () => {
  it('maps electron-updater events onto AppUpdateStatus', async () => {
    const feed = fakeFeed();
    const sent: AppUpdateStatus[] = [];
    const handle = bindAutoUpdater(feed, (s) => sent.push(s));
    expect(feed.autoDownload).toBe(true);
    expect(feed.autoInstallOnAppQuit).toBe(true);

    for (const fn of feed.listeners['checking-for-update']) fn();
    for (const fn of feed.listeners['update-available']) fn({ version: '1.4.0' });
    for (const fn of feed.listeners['download-progress']) fn({ percent: 42.2 });
    for (const fn of feed.listeners['update-downloaded']) fn({ version: '1.4.0' });
    for (const fn of feed.listeners['update-not-available']) fn();
    for (const fn of feed.listeners['error']) fn(new Error('boom'));

    expect(sent).toEqual(expect.arrayContaining([
      { state: 'checking' },
      { state: 'available', version: '1.4.0' },
      { state: 'downloading', percent: 42.2 },
      { state: 'ready', version: '1.4.0' },
      { state: 'not-available' },
      { state: 'error', message: 'boom' },
    ]));

    await handle.check();
    expect(sent.filter((s) => s.state === 'checking').length).toBeGreaterThanOrEqual(2);

    handle.quitAndInstall();
    expect(feed.quitAndInstall).toHaveBeenCalled();
  });

  it('reports checkForUpdates failures', async () => {
    const feed = fakeFeed();
    feed.fail = true;
    const sent: AppUpdateStatus[] = [];
    const handle = bindAutoUpdater(feed, (s) => sent.push(s));
    await handle.check();
    expect(sent[sent.length - 1]).toEqual({ state: 'error', message: 'network' });
  });
});
