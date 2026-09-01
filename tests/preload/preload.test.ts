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
    await api.getServerStatus();
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('cgate:connect', opts);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('cgate:disconnect');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('cgate:getTree', '254');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('cgate:serverStatus');
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

  it('subscribes to trigger, treeChanged, measurement, activity, and update events', () => {
    const trigger = jest.fn();
    const tree = jest.fn();
    const measurement = jest.fn();
    const activity = jest.fn();
    const update = jest.fn();
    const offT = api.onTrigger(trigger);
    const offC = api.onTreeChanged(tree);
    const offM = api.onMeasurement(measurement);
    const offA = api.onActivity(activity);
    const offU = api.onUpdate(update);
    listeners['cgate:trigger']({}, { address: '254/202/1' });
    listeners['cgate:treeChanged']({}, { network: '254' });
    listeners['cgate:measurement']({}, { address: '254/228/1', value: 21 });
    listeners['cgate:activity']({}, { command: 'ON' });
    listeners['app:updateStatus']({}, { state: 'ready', version: '1.4.0' });
    expect(trigger).toHaveBeenCalled();
    expect(tree).toHaveBeenCalled();
    expect(measurement).toHaveBeenCalled();
    expect(activity).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({ state: 'ready', version: '1.4.0' });
    offT();
    offC();
    offM();
    offA();
    offU();
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith('cgate:trigger', expect.any(Function));
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith('cgate:treeChanged', expect.any(Function));
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith('cgate:measurement', expect.any(Function));
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith('cgate:activity', expect.any(Function));
    expect(ipcRenderer.removeListener).toHaveBeenCalledWith('app:updateStatus', expect.any(Function));
  });

  it('exposes a sites API mapped to the sites IPC channels', async () => {
    const input = { name: 'Home', host: 'h', commandPort: 1, eventPort: 2 };
    await api.sites.list();
    await api.sites.add(input);
    await api.sites.update({ id: 'x', ...input });
    await api.sites.remove('x');
    await api.sites.getImportedLabels('site-1');
    await api.sites.saveImportedLabels('site-1', { source: 'a.cbz', networks: {}, applications: {}, groups: {}, stats: { networkCount: 0, groupCount: 0, labelCount: 0 } });
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('sites:list');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('sites:add', input);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('sites:update', { id: 'x', ...input });
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('sites:remove', 'x');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('sites:labels:get', 'site-1');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('sites:labels:save', 'site-1', expect.any(Object));
  });

  it('exposes control, labels, and project APIs mapped to their IPC channels', async () => {
    const ref = { network: '254', application: '56', group: '4' };
    await api.control.setLevel(ref, 128, 4);
    await api.control.terminateRamp(ref);
    await api.control.fireScene(ref, 4);
    await api.labels.rename(ref, 'Kitchen');
    await api.labels.clear(ref);
    await api.project.save();
    await api.project.name();
    await api.project.dir();
    await api.project.list();
    await api.project.load('TESTPROJ');
    await api.project.start('TESTPROJ');
    await api.project.use('TESTPROJ');
    await api.net.list();
    await api.net.open('254');
    await api.net.close('254');
    await api.net.sync('254');
    await api.net.health('254');
    await api.activity.list();
    await api.project.import();
    await api.project.export({ tree: [], projectName: 'TEST' });
    await api.nodes.getGroupDetail(ref);
    await api.nodes.getNetworkLevels('254');
    await api.nodes.identifyUnit('254', '10');
    await api.nodes.getGroupParams(ref);
    await api.nodes.getUnitParams('254', '10');
    await api.nodes.setGroupParam(ref, 'RampTime', '6');
    await api.nodes.setUnitName('254', '10', 'Hall');
    await api.updates.check();
    await api.updates.quitAndInstall();
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('control:setLevel', ref, 128, 4);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('control:terminateRamp', ref);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('control:fireScene', ref, 4);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('labels:rename', ref, 'Kitchen');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('labels:clear', ref);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('project:save');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('project:name');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('project:dir');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('project:list');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('project:load', 'TESTPROJ');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('project:start', 'TESTPROJ');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('project:use', 'TESTPROJ');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('net:list');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('net:open', '254');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('net:close', '254');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('net:sync', '254');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('net:health', '254');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('activity:list');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('project:import');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('project:export', { tree: [], projectName: 'TEST' });
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('nodes:detail', ref);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('nodes:networkLevels', '254', undefined);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('nodes:identifyUnit', '254', '10');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('nodes:groupParams', ref);
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('nodes:unitParams', '254', '10');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('nodes:setGroupParam', ref, 'RampTime', '6');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('nodes:setUnitName', '254', '10', 'Hall');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('app:updateCheck');
    expect(ipcRenderer.invoke).toHaveBeenCalledWith('app:updateInstall');
  });
});
