import type { AppUpdateStatus } from '../shared/types';

export type UpdateFeed = {
  autoDownload: boolean;
  autoInstallOnAppQuit?: boolean;
  on(event: string, listener: (...args: unknown[]) => void): void;
  checkForUpdates(): Promise<unknown>;
  quitAndInstall(isSilent?: boolean, isForceRunAfter?: boolean): void;
};

export type AutoUpdateHandle = {
  check(): Promise<void>;
  quitAndInstall(): void;
};

export function shouldCheckForUpdates(isPackaged: boolean, skipEnv?: string | undefined): boolean {
  if (!isPackaged) return false;
  if (skipEnv === '1') return false;
  return true;
}

export function bindAutoUpdater(feed: UpdateFeed, send: (status: AppUpdateStatus) => void): AutoUpdateHandle {
  feed.autoDownload = true;
  feed.autoInstallOnAppQuit = true;
  feed.on('checking-for-update', () => send({ state: 'checking' }));
  feed.on('update-available', (info) => {
    const version = info && typeof info === 'object' && 'version' in info
      ? String((info as { version: unknown }).version)
      : undefined;
    send({ state: 'available', version });
  });
  feed.on('update-not-available', () => send({ state: 'not-available' }));
  feed.on('download-progress', (progress) => {
    const percent = progress && typeof progress === 'object' && 'percent' in progress
      ? Number((progress as { percent: unknown }).percent)
      : undefined;
    send({ state: 'downloading', percent: Number.isFinite(percent) ? percent : undefined });
  });
  feed.on('update-downloaded', (info) => {
    const version = info && typeof info === 'object' && 'version' in info
      ? String((info as { version: unknown }).version)
      : undefined;
    send({ state: 'ready', version });
  });
  feed.on('error', (err) => {
    const message = err instanceof Error ? err.message : String(err ?? 'Update failed');
    send({ state: 'error', message });
  });

  return {
    async check() {
      send({ state: 'checking' });
      try {
        await feed.checkForUpdates();
      } catch (err) {
        send({
          state: 'error',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    quitAndInstall() {
      feed.quitAndInstall();
    },
  };
}
