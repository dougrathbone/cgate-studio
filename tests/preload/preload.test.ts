jest.mock('electron', () => {
  const listeners: Record<string, Function> = {};
  return {
    contextBridge: { exposeInMainWorld: jest.fn() },
    ipcRenderer: {
      invoke: jest.fn().mockResolvedValue('RESULT'),
      on: jest.fn((ch: string, h: Function) => { listeners[ch] = h; }),
      removeListener: jest.fn(),
      __listeners: listeners,
    },
  };
});

import { contextBridge, ipcRenderer } from 'electron';
import '../../src/preload/index';

const api = (contextBridge.exposeInMainWorld as jest.Mock).mock.calls[0][1];
const listeners = (ipcRenderer as any).__listeners as Record<string, Function>;

describe('preload bridge', () => {
  it('exposes the cgate API on the main world', () => {
    expect((contextBridge.exposeInMainWorld as jest.Mock).mock.calls[0][0]).toBe('cgate');
    expect(typeof api.connect).toBe('function');
  });

  it('connect/disconnect/getTree invoke the matching IPC channels', async () => {
    const opts = { host: 'h', commandPort: 1, eventPort: 2 };
    await api.connect(opts);
    await api.disconnect();
    await api.getTree('254');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('cgate:connect', opts);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('cgate:disconnect');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('cgate:getTree', '254');
  });

  it('onStatus subscribes, delivers values, and returns an unsubscribe', () => {
    const cb = jest.fn();
    const off = api.onStatus(cb);
    expect(ipcRenderer.on).toHaveBeenCalledWith('cgate:status', expect.any(Function));
    listeners['cgate:status']({}, 'connected');
    expect(cb).toHaveBeenCalledWith('connected');
    off();
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith('cgate:status', expect.any(Function));
  });

  it('onState subscribes, delivers values, and returns an unsubscribe', () => {
    const cb = jest.fn();
    const off = api.onState(cb);
    const payload = { address: '254/56/4', level: 200, on: true };
    listeners['cgate:state']({}, payload);
    expect(cb).toHaveBeenCalledWith(payload);
    off();
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith('cgate:state', expect.any(Function));
  });
});
