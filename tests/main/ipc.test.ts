jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn() },
  dialog: { showOpenDialog: jest.fn(), showSaveDialog: jest.fn() },
  BrowserWindow: class {},
}));

jest.mock('../../src/main/projectExport', () => ({
  exportLabelsToFile: jest.fn().mockReturnValue({
    path: '/tmp/export.xml',
    stats: { networkCount: 1, groupCount: 3, labelCount: 2, unitCount: 1 },
  }),
}));

jest.mock('../../src/main/projectImport', () => ({
  importLabelsFromFile: jest.fn().mockResolvedValue({
    source: 'home.cbz',
    networks: { '254': 'Home' },
    applications: { '254/56': 'Lighting' },
    groups: { '254/56/4': 'Kitchen' },
    stats: { networkCount: 1, groupCount: 1, labelCount: 1 },
  }),
}));

jest.mock('../../src/main/CgateService', () => {
  const { EventEmitter } = require('events');
  class FakeService extends EventEmitter {
    connect = jest.fn().mockResolvedValue(undefined);
    disconnect = jest.fn().mockResolvedValue(undefined);
    getTree = jest.fn().mockResolvedValue([]);
    setLevel = jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] });
    terminateRamp = jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] });
    setName = jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] });
    saveProject = jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] });
    getProjectName = jest.fn().mockResolvedValue('TESTPROJ');
    getGroupDetail = jest.fn().mockResolvedValue({ label: 'Kitchen', level: 200 });
    getServerStatus = jest.fn().mockResolvedValue({
      connection: 'connected',
      host: 'h',
      commandPort: 20023,
      eventPort: 20025,
      commandConnected: true,
      eventConnected: true,
      serverVersion: 'v2.8.0',
      serverGreeting: null,
      activeProject: { name: 'TESTPROJ', state: 'started' },
      loadedProjects: [],
      projectsOnDisk: [],
    });
  }
  return { CgateService: FakeService };
});

import { ipcMain, dialog } from 'electron';
import { registerIpc, CHANNELS } from '../../src/main/ipc';
import { importLabelsFromFile } from '../../src/main/projectImport';
import { exportLabelsToFile } from '../../src/main/projectExport';

const handleMock = ipcMain.handle as jest.Mock;
const showOpenDialogMock = dialog.showOpenDialog as jest.Mock;
const showSaveDialogMock = dialog.showSaveDialog as jest.Mock;
const importMock = importLabelsFromFile as jest.Mock;
const exportMock = exportLabelsToFile as jest.Mock;

function fakeStore() {
  return {
    list: jest.fn().mockReturnValue([{ id: '1', name: 'A', host: 'h', commandPort: 1, eventPort: 2 }]),
    add: jest.fn().mockReturnValue([]),
    update: jest.fn().mockReturnValue([]),
    remove: jest.fn().mockReturnValue([]),
  } as any;
}

function fakeLabelStore() {
  return {
    get: jest.fn().mockReturnValue(null),
    save: jest.fn(),
    remove: jest.fn(),
  } as any;
}

function lastHandler(channel: string): Function {
  const call = [...handleMock.mock.calls].reverse().find((c) => c[0] === channel);
  return call![1];
}

describe('registerIpc', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers cgate and sites handlers', () => {
    registerIpc(() => null, fakeStore(), fakeLabelStore());
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
    const svc = registerIpc(() => ({ webContents: { send } } as any), fakeStore(), fakeLabelStore());
    svc.emit('status', 'connected');
    svc.emit('state', { address: '254/56/4', level: 128, on: true });
    expect(send).toHaveBeenCalledWith(CHANNELS.status, 'connected');
    expect(send).toHaveBeenCalledWith(
      CHANNELS.state,
      expect.objectContaining({ address: '254/56/4', level: 128, on: true }),
    );
  });

  it('does not throw when there is no window to forward to', () => {
    const svc = registerIpc(() => null, fakeStore(), fakeLabelStore());
    expect(() => svc.emit('status', 'reconnecting')).not.toThrow();
    expect(() => svc.emit('state', { address: 'a', level: 0, on: false })).not.toThrow();
  });

  it('routes cgate invocations to the service', async () => {
    const svc = registerIpc(() => null, fakeStore(), fakeLabelStore());
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
    registerIpc(() => null, store, fakeLabelStore());
    const input = { name: 'B', host: 'h2', commandPort: 3, eventPort: 4 };
    expect(await lastHandler(CHANNELS.sitesList)({})).toHaveLength(1);
    await lastHandler(CHANNELS.sitesAdd)({}, input);
    await lastHandler(CHANNELS.sitesUpdate)({}, { id: '1', ...input });
    await lastHandler(CHANNELS.sitesRemove)({}, '1');
    expect(store.add).toHaveBeenCalledWith(input);
    expect(store.update).toHaveBeenCalledWith({ id: '1', ...input });
    expect(store.remove).toHaveBeenCalledWith('1');
  });

  it('routes control, rename, and project invocations to the service', async () => {
    const svc = registerIpc(() => null, fakeStore(), fakeLabelStore());
    const ref = { network: '254', application: '56', group: '4' };
    await lastHandler(CHANNELS.setLevel)({}, ref, 128, 4);
    await lastHandler(CHANNELS.terminateRamp)({}, ref);
    await lastHandler(CHANNELS.rename)({}, ref, 'Kitchen');
    await lastHandler(CHANNELS.projectSave)({});
    await lastHandler(CHANNELS.projectName)({});
    expect(svc.setLevel).toHaveBeenCalledWith(ref, 128, 4);
    expect(svc.terminateRamp).toHaveBeenCalledWith(ref);
    expect(svc.setName).toHaveBeenCalledWith(ref, 'Kitchen');
    expect(svc.saveProject).toHaveBeenCalled();
    expect(svc.getProjectName).toHaveBeenCalled();
  });

  it('routes nodes:detail to the service', async () => {
    const svc = registerIpc(() => null, fakeStore(), fakeLabelStore());
    const ref = { network: '254', application: '56', group: '4' };
    const detail = await lastHandler(CHANNELS.nodeDetail)({}, ref);
    expect(svc.getGroupDetail).toHaveBeenCalledWith(ref);
    expect(detail).toEqual({ label: 'Kitchen', level: 200 });
  });

  it('routes cgate:serverStatus to the service', async () => {
    const svc = registerIpc(() => null, fakeStore(), fakeLabelStore());
    const st = await lastHandler(CHANNELS.serverStatus)({});
    expect(svc.getServerStatus).toHaveBeenCalled();
    expect(st.serverVersion).toBe('v2.8.0');
  });

  it('project:import parses the chosen file and returns its labels', async () => {
    showOpenDialogMock.mockResolvedValue({ canceled: false, filePaths: ['/tmp/home.cbz'] });
    registerIpc(() => null, fakeStore(), fakeLabelStore());
    const imp = await lastHandler(CHANNELS.projectImport)({});
    expect(importMock).toHaveBeenCalledWith('/tmp/home.cbz');
    expect(imp.groups['254/56/4']).toBe('Kitchen');
  });

  it('project:import returns null when the picker is cancelled', async () => {
    showOpenDialogMock.mockResolvedValue({ canceled: true, filePaths: [] });
    importMock.mockClear();
    registerIpc(() => null, fakeStore(), fakeLabelStore());
    const imp = await lastHandler(CHANNELS.projectImport)({});
    expect(imp).toBeNull();
    expect(importMock).not.toHaveBeenCalled();
  });

  it('project:export writes the chosen file and returns stats', async () => {
    showSaveDialogMock.mockResolvedValue({ canceled: false, filePath: '/tmp/out.xml' });
    registerIpc(() => null, fakeStore(), fakeLabelStore());
    const input = { tree: [], projectName: 'MYPROJ' };
    const result = await lastHandler(CHANNELS.projectExport)({}, input);
    expect(showSaveDialogMock).toHaveBeenCalled();
    expect(exportMock).toHaveBeenCalledWith('/tmp/out.xml', input);
    expect(result?.stats.labelCount).toBe(2);
  });

  it('removes persisted labels when a site is deleted', async () => {
    const labels = fakeLabelStore();
    registerIpc(() => null, fakeStore(), labels);
    await lastHandler(CHANNELS.sitesRemove)({}, 'site-1');
    expect(labels.remove).toHaveBeenCalledWith('site-1');
  });

  it('loads and saves imported labels for a site', async () => {
    const labels = fakeLabelStore();
    const imp = {
      source: 'x.cbz',
      networks: { '254': 'Home' },
      applications: {},
      groups: { '254/56/4': 'Kitchen' },
      stats: { networkCount: 1, groupCount: 1, labelCount: 1 },
    };
    labels.get.mockReturnValue(imp);
    registerIpc(() => null, fakeStore(), labels);
    expect(await lastHandler(CHANNELS.sitesLabelsGet)({}, 'site-1')).toBe(imp);
    await lastHandler(CHANNELS.sitesLabelsSave)({}, 'site-1', imp);
    expect(labels.save).toHaveBeenCalledWith('site-1', imp);
  });
});
