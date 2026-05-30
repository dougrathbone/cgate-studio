jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn() },
  BrowserWindow: class {},
}));

jest.mock('../../src/main/CgateService', () => {
  const { EventEmitter } = require('events');
  class FakeService extends EventEmitter {
    connect = jest.fn().mockResolvedValue(undefined);
    disconnect = jest.fn().mockResolvedValue(undefined);
    getTree = jest.fn().mockResolvedValue([]);
  }
  return { CgateService: FakeService };
});

import { ipcMain } from 'electron';
import { registerIpc, CHANNELS } from '../../src/main/ipc';

const handleMock = ipcMain.handle as jest.Mock;

function fakeStore() {
  return {
    list: jest.fn().mockReturnValue([{ id: '1', name: 'A', host: 'h', commandPort: 1, eventPort: 2 }]),
    add: jest.fn().mockReturnValue([]),
    update: jest.fn().mockReturnValue([]),
    remove: jest.fn().mockReturnValue([]),
  } as any;
}

function lastHandler(channel: string): Function {
  const call = [...handleMock.mock.calls].reverse().find((c) => c[0] === channel);
  return call![1];
}

describe('registerIpc', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers cgate and sites handlers', () => {
    registerIpc(() => null, fakeStore());
    const channels = handleMock.mock.calls.map((c) => c[0]);
    expect(channels).toEqual(
      expect.arrayContaining([
        CHANNELS.connect, CHANNELS.disconnect, CHANNELS.getTree,
        CHANNELS.sitesList, CHANNELS.sitesAdd, CHANNELS.sitesUpdate, CHANNELS.sitesRemove,
      ]),
    );
  });

  it('forwards status and state events to the active window', () => {
    const send = jest.fn();
    const svc = registerIpc(() => ({ webContents: { send } } as any), fakeStore());
    svc.emit('status', 'connected');
    svc.emit('state', { address: '254/56/4', level: 128, on: true });
    expect(send).toHaveBeenCalledWith(CHANNELS.status, 'connected');
    expect(send).toHaveBeenCalledWith(
      CHANNELS.state,
      expect.objectContaining({ address: '254/56/4', level: 128, on: true }),
    );
  });

  it('does not throw when there is no window to forward to', () => {
    const svc = registerIpc(() => null, fakeStore());
    expect(() => svc.emit('status', 'reconnecting')).not.toThrow();
    expect(() => svc.emit('state', { address: 'a', level: 0, on: false })).not.toThrow();
  });

  it('routes cgate invocations to the service', async () => {
    const svc = registerIpc(() => null, fakeStore());
    const opts = { host: 'h', commandPort: 1, eventPort: 2 };
    await lastHandler(CHANNELS.connect)({}, opts);
    await lastHandler(CHANNELS.getTree)({}, '254');
    await lastHandler(CHANNELS.disconnect)({});
    expect(svc.connect).toHaveBeenCalledWith(opts);
    expect(svc.getTree).toHaveBeenCalledWith('254');
    expect(svc.disconnect).toHaveBeenCalled();
  });

  it('routes sites invocations to the store', async () => {
    const store = fakeStore();
    registerIpc(() => null, store);
    const input = { name: 'B', host: 'h2', commandPort: 3, eventPort: 4 };
    expect(await lastHandler(CHANNELS.sitesList)({})).toHaveLength(1);
    await lastHandler(CHANNELS.sitesAdd)({}, input);
    await lastHandler(CHANNELS.sitesUpdate)({}, { id: '1', ...input });
    await lastHandler(CHANNELS.sitesRemove)({}, '1');
    expect(store.add).toHaveBeenCalledWith(input);
    expect(store.update).toHaveBeenCalledWith({ id: '1', ...input });
    expect(store.remove).toHaveBeenCalledWith('1');
  });
});
