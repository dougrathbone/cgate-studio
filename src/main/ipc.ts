import { ipcMain, dialog, BrowserWindow } from 'electron';
import { CgateService } from './CgateService';
import { SiteStore } from './SiteStore';
import { LabelStore } from './LabelStore';
import { importLabelsFromFile } from './projectImport';
import { exportLabelsToFile, exportInventoryToFile } from './projectExport';
import { CHANNELS } from '../shared/ipcChannels';
import type {
  ConnectOptions,
  Site,
  SiteInput,
  GroupRef,
  LabelImport,
  LabelExportInput,
  LabelExportResult,
  TriggerActivity,
  TreeChange,
  MeasurementState,
  ActivityEntry,
} from '../shared/types';
import type { AutoUpdateHandle } from './autoUpdate';
import {
  assertActionSelector,
  assertAddressSegment,
  assertConnectOptions,
  assertGroupRef,
  assertLabelImport,
  assertLevel,
  assertOptionalRampSecs,
  assertParamName,
  assertSite,
  assertSiteInput,
  assertToken,
  IpcValidationError,
} from './ipcValidate';

export { CHANNELS };

const openDialogOptions = {
  title: 'Import C-Bus project labels',
  properties: ['openFile' as const],
  filters: [
    { name: 'C-Bus project', extensions: ['cbz', 'xml'] },
    { name: 'All files', extensions: ['*'] },
  ],
};

const saveDialogOptions = {
  title: 'Export C-Bus project labels',
  filters: [
    { name: 'C-Bus project XML', extensions: ['xml'] },
    { name: 'C-Bus project archive', extensions: ['cbz'] },
    { name: 'CSV tags', extensions: ['csv'] },
    { name: 'All files', extensions: ['*'] },
  ],
};

function validationFailure(err: unknown): never {
  if (err instanceof IpcValidationError) throw err;
  throw err;
}

export function registerIpc(
  getWindow: () => BrowserWindow | null,
  siteStore: SiteStore,
  labelStore: LabelStore,
  updates?: AutoUpdateHandle | null,
): CgateService {
  const svc = new CgateService();

  svc.on('status', (s) => getWindow()?.webContents.send(CHANNELS.status, s));
  svc.on('state', (st) => getWindow()?.webContents.send(CHANNELS.state, st));
  svc.on('trigger', (t: TriggerActivity) => getWindow()?.webContents.send(CHANNELS.trigger, t));
  svc.on('treeChanged', (c: TreeChange) => getWindow()?.webContents.send(CHANNELS.treeChanged, c));
  svc.on('measurement', (m: MeasurementState) => getWindow()?.webContents.send(CHANNELS.measurement, m));
  svc.on('activity', (a: ActivityEntry) => getWindow()?.webContents.send(CHANNELS.activity, a));
  svc.on('error', (e: Error) => {
    const msg = e?.message ? String(e.message).slice(0, 500) : 'Unknown error';
    getWindow()?.webContents.send(CHANNELS.status, 'error');
    getWindow()?.webContents.send(CHANNELS.activity, {
      id: Date.now(),
      at: Date.now(),
      direction: 'info' as const,
      text: `Error: ${msg}`,
    });
  });

  ipcMain.handle(CHANNELS.connect, (_e, opts: ConnectOptions) => {
    try {
      return svc.connect(assertConnectOptions(opts));
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.disconnect, () => svc.disconnect());
  ipcMain.handle(CHANNELS.getTree, (_e, network: string) => {
    try {
      return svc.getTree(assertAddressSegment(network, 'network'));
    } catch (err) {
      validationFailure(err);
    }
  });

  ipcMain.handle(CHANNELS.sitesList, () => siteStore.list());
  ipcMain.handle(CHANNELS.sitesCanPersistPassword, () => siteStore.encryptionAvailable());
  ipcMain.handle(CHANNELS.sitesAdd, (_e, input: SiteInput) => {
    try {
      return siteStore.add(assertSiteInput(input));
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.sitesUpdate, (_e, site: Site) => {
    try {
      return siteStore.update(assertSite(site));
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.sitesRemove, (_e, id: string) => {
    const sid = String(id ?? '').trim();
    if (!sid) throw new IpcValidationError('Invalid site id');
    labelStore.remove(sid);
    return siteStore.remove(sid);
  });

  ipcMain.handle(CHANNELS.sitesLabelsGet, (_e, siteId: string | null) =>
    labelStore.get(siteId == null ? null : String(siteId)));
  ipcMain.handle(CHANNELS.sitesLabelsSave, (_e, siteId: string | null, labels: LabelImport) => {
    try {
      labelStore.save(siteId == null ? null : String(siteId), assertLabelImport(labels));
    } catch (err) {
      validationFailure(err);
    }
  });

  ipcMain.handle(CHANNELS.setLevel, (_e, ref: GroupRef, level: number, rampSecs?: number) => {
    try {
      return svc.setLevel(assertGroupRef(ref), assertLevel(level), assertOptionalRampSecs(rampSecs));
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.terminateRamp, (_e, ref: GroupRef) => {
    try {
      return svc.terminateRamp(assertGroupRef(ref));
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.fireScene, (_e, ref: GroupRef, actionSelector: number) => {
    try {
      return svc.fireScene(assertGroupRef(ref), assertActionSelector(actionSelector));
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.rename, (_e, ref: GroupRef, name: string) => {
    try {
      return svc.setName(assertGroupRef(ref), String(name ?? '').slice(0, 256));
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.clearTag, (_e, ref: GroupRef) => {
    try {
      return svc.clearTagName(assertGroupRef(ref));
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.projectSave, () => svc.saveProject());
  ipcMain.handle(CHANNELS.projectName, () => svc.getProjectName());
  ipcMain.handle(CHANNELS.projectDir, () => svc.listProjectsOnDisk());
  ipcMain.handle(CHANNELS.projectList, () => svc.listLoadedProjects());
  ipcMain.handle(CHANNELS.projectLoad, (_e, name: string) => {
    try {
      return svc.loadProject(assertToken(name, 'project'));
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.projectStart, (_e, name: string) => {
    try {
      return svc.startProject(assertToken(name, 'project'));
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.projectUse, (_e, name: string) => {
    try {
      return svc.useProject(assertToken(name, 'project'));
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.netList, () => svc.listNetworks());
  ipcMain.handle(CHANNELS.netOpen, (_e, network: string) => {
    try {
      return svc.openNetwork(assertAddressSegment(network, 'network'));
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.netClose, (_e, network: string) => {
    try {
      return svc.closeNetwork(assertAddressSegment(network, 'network'));
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.netSync, (_e, network: string) => {
    try {
      return svc.syncNetwork(assertAddressSegment(network, 'network'));
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.netHealth, (_e, network: string) => {
    try {
      return svc.refreshNetworkHealth(assertAddressSegment(network, 'network'));
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.activityLog, () => svc.getActivityLog());
  ipcMain.handle(CHANNELS.nodeDetail, (_e, ref: GroupRef) => {
    try {
      return svc.getGroupDetail(assertGroupRef(ref));
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.networkLevels, (_e, network: string, applications?: string[]) => {
    try {
      const net = assertAddressSegment(network, 'network');
      const apps = Array.isArray(applications)
        ? applications.map((a) => assertAddressSegment(a, 'application'))
        : undefined;
      return svc.getNetworkLevels(net, apps);
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.identifyUnit, (_e, network: string, unit: string) => {
    try {
      return svc.identifyUnit(
        assertAddressSegment(network, 'network'),
        assertAddressSegment(unit, 'unit'),
      );
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.serverStatus, () => svc.getServerStatus());
  ipcMain.handle(CHANNELS.groupParams, (_e, ref: GroupRef) => {
    try {
      return svc.getGroupParams(assertGroupRef(ref));
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.unitParams, (_e, network: string, unit: string) => {
    try {
      return svc.getUnitParams(
        assertAddressSegment(network, 'network'),
        assertAddressSegment(unit, 'unit'),
      );
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.setGroupParam, (_e, ref: GroupRef, param: string, value: string) => {
    try {
      return svc.setGroupParam(
        assertGroupRef(ref),
        assertParamName(param),
        String(value ?? '').slice(0, 512),
      );
    } catch (err) {
      validationFailure(err);
    }
  });
  ipcMain.handle(CHANNELS.setUnitName, (_e, network: string, unit: string, name: string) => {
    try {
      return svc.setUnitName(
        assertAddressSegment(network, 'network'),
        assertAddressSegment(unit, 'unit'),
        String(name ?? '').slice(0, 256),
      );
    } catch (err) {
      validationFailure(err);
    }
  });

  ipcMain.handle(CHANNELS.projectImport, async (): Promise<LabelImport | null> => {
    const win = getWindow();
    const result = win
      ? await dialog.showOpenDialog(win, openDialogOptions)
      : await dialog.showOpenDialog(openDialogOptions);
    const file = result.filePaths?.[0];
    if (result.canceled || !file) return null;
    return importLabelsFromFile(file);
  });

  ipcMain.handle(CHANNELS.projectExport, async (_e, input: LabelExportInput): Promise<LabelExportResult | null> => {
    const win = getWindow();
    const defaultPath = `${(input.projectName?.trim() || 'cbus-labels').replace(/[^\w.-]+/g, '_')}.xml`;
    const result = win
      ? await dialog.showSaveDialog(win, { ...saveDialogOptions, defaultPath })
      : await dialog.showSaveDialog({ ...saveDialogOptions, defaultPath });
    const file = result.filePath;
    if (result.canceled || !file) return null;
    return exportLabelsToFile(file, input);
  });

  ipcMain.handle(CHANNELS.inventoryExport, async (_e, input: LabelExportInput): Promise<LabelExportResult | null> => {
    const win = getWindow();
    const defaultPath = `${(input.projectName?.trim() || 'cbus-inventory').replace(/[^\w.-]+/g, '_')}-inventory.csv`;
    const opts = {
      title: 'Export unit inventory',
      filters: [
        { name: 'CSV inventory', extensions: ['csv'] },
        { name: 'All files', extensions: ['*'] },
      ],
      defaultPath,
    };
    const result = win
      ? await dialog.showSaveDialog(win, opts)
      : await dialog.showSaveDialog(opts);
    const file = result.filePath;
    if (result.canceled || !file) return null;
    return exportInventoryToFile(file, input);
  });

  ipcMain.handle(CHANNELS.updateCheck, () => updates?.check());
  ipcMain.handle(CHANNELS.updateInstall, () => {
    updates?.quitAndInstall();
  });

  return svc;
}
