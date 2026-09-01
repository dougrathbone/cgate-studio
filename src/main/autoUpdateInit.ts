import { app, dialog, type BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import { bindAutoUpdater, shouldCheckForUpdates, type AutoUpdateHandle } from './autoUpdate';
import type { AppUpdateStatus } from '../shared/types';

export function initAutoUpdate(
  send: (status: AppUpdateStatus) => void,
  getWindow: () => BrowserWindow | null,
): AutoUpdateHandle {
  if (!shouldCheckForUpdates(app.isPackaged, process.env.CBUS_SKIP_AUTO_UPDATE)) {
    return {
      async check() {
        const parent = getWindow();
        const opts = {
          type: 'info' as const,
          title: 'Updates',
          message: 'Updates are checked in the installed app.',
          detail: 'Packaged builds look at GitHub Releases. Development runs (`npm run dev`) skip that check.',
          buttons: ['OK'],
        };
        if (parent) await dialog.showMessageBox(parent, opts);
        else await dialog.showMessageBox(opts);
        send({ state: 'dev' });
      },
      quitAndInstall() { /* nothing to install in unpackaged / skipped mode */ },
    };
  }

  autoUpdater.logger = null;
  return bindAutoUpdater(autoUpdater, send);
}
