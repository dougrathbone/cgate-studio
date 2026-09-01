const showMessageBox = jest.fn().mockResolvedValue({ response: 0 });
const isPackaged = { value: false };

jest.mock('electron', () => ({
  app: {
    get isPackaged() { return isPackaged.value; },
  },
  dialog: {
    showMessageBox: (...args: unknown[]) => showMessageBox(...args),
  },
}));

const checkForUpdates = jest.fn().mockResolvedValue({});
const quitAndInstall = jest.fn();
const on = jest.fn();

jest.mock('electron-updater', () => ({
  autoUpdater: {
    autoDownload: false,
    logger: undefined,
    on: (...args: unknown[]) => on(...args),
    checkForUpdates: (...args: unknown[]) => checkForUpdates(...args),
    quitAndInstall: (...args: unknown[]) => quitAndInstall(...args),
  },
}));

import { initAutoUpdate } from '../../src/main/autoUpdateInit';

describe('initAutoUpdate', () => {
  afterEach(() => {
    showMessageBox.mockClear();
    isPackaged.value = false;
    process.env.CBUS_SKIP_AUTO_UPDATE = '';
  });

  it('shows a packaged-only dialog in development', async () => {
    isPackaged.value = false;
    const send = jest.fn();
    const handle = initAutoUpdate(send, () => null);
    await handle.check();
    expect(showMessageBox).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Updates',
    }));
    expect(send).toHaveBeenCalledWith({ state: 'dev' });
    handle.quitAndInstall();
    expect(quitAndInstall).not.toHaveBeenCalled();
  });

  it('uses a parent window for the dev dialog when provided', async () => {
    isPackaged.value = false;
    const parent = { id: 1 } as any;
    const handle = initAutoUpdate(jest.fn(), () => parent);
    await handle.check();
    expect(showMessageBox).toHaveBeenCalledWith(parent, expect.objectContaining({ title: 'Updates' }));
  });

  it('binds electron-updater when packaged', async () => {
    isPackaged.value = true;
    const send = jest.fn();
    const handle = initAutoUpdate(send, () => null);
    expect(on).toHaveBeenCalled();
    await handle.check();
    expect(checkForUpdates).toHaveBeenCalled();
  });
});
