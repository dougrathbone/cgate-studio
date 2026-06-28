import { ipcMain, dialog, BrowserWindow } from 'electron';
import { CgateService } from './CgateService';
import { SiteStore } from './SiteStore';
import { LabelStore } from './LabelStore';
import { importLabelsFromFile } from './projectImport';
import { exportLabelsToFile } from './projectExport';
import type { ConnectOptions, Site, SiteInput, GroupRef, LabelImport, LabelExportInput, LabelExportResult, TriggerActivity, TreeChange, MeasurementState } from '../shared/types';

export const CHANNELS = {
  connect: 'cgate:connect',
  disconnect: 'cgate:disconnect',
  getTree: 'cgate:getTree',
  status: 'cgate:status',   // main -> renderer push
  state: 'cgate:state',     // main -> renderer push
  sitesList: 'sites:list',
  sitesAdd: 'sites:add',
  sitesUpdate: 'sites:update',
  sitesRemove: 'sites:remove',
  sitesLabelsGet: 'sites:labels:get',
  sitesLabelsSave: 'sites:labels:save',
  setLevel: 'control:setLevel',         // M2: switch / ramp
  terminateRamp: 'control:terminateRamp',
  rename: 'labels:rename',              // M3: set group Name
  projectSave: 'project:save',          // M3: persist DB
  projectName: 'project:name',
  projectImport: 'project:import',      // import labels from a .cbz / .xml file
  projectExport: 'project:export',      // export labels to a .cbz / .xml file
  nodeDetail: 'nodes:detail',           // lazy per-group label + level enrichment
  serverStatus: 'cgate:serverStatus',   // query live C-Gate server info
  groupParams: 'nodes:groupParams',
  unitParams: 'nodes:unitParams',
  setGroupParam: 'nodes:setGroupParam',
  setUnitName: 'nodes:setUnitName',
  fireScene: 'control:fireScene',     // M4: fire a trigger-control scene
  trigger: 'cgate:trigger',           // main -> renderer push (trigger activity)
  treeChanged: 'cgate:treeChanged',   // main -> renderer push (742 reconcile)
  measurement: 'cgate:measurement',   // main -> renderer push (sensor readings)
} as const;

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
    { name: 'All files', extensions: ['*'] },
  ],
};

export function registerIpc(
  getWindow: () => BrowserWindow | null,
  siteStore: SiteStore,
  labelStore: LabelStore,
): CgateService {
  const svc = new CgateService();

  svc.on('status', (s) => getWindow()?.webContents.send(CHANNELS.status, s));
  svc.on('state', (st) => getWindow()?.webContents.send(CHANNELS.state, st));
  svc.on('trigger', (t: TriggerActivity) => getWindow()?.webContents.send(CHANNELS.trigger, t));
  svc.on('treeChanged', (c: TreeChange) => getWindow()?.webContents.send(CHANNELS.treeChanged, c));
  svc.on('measurement', (m: MeasurementState) => getWindow()?.webContents.send(CHANNELS.measurement, m));

  ipcMain.handle(CHANNELS.connect, (_e, opts: ConnectOptions) => svc.connect(opts));
  ipcMain.handle(CHANNELS.disconnect, () => svc.disconnect());
  ipcMain.handle(CHANNELS.getTree, (_e, network: string) => svc.getTree(network));

  ipcMain.handle(CHANNELS.sitesList, () => siteStore.list());
  ipcMain.handle(CHANNELS.sitesAdd, (_e, input: SiteInput) => siteStore.add(input));
  ipcMain.handle(CHANNELS.sitesUpdate, (_e, site: Site) => siteStore.update(site));
  ipcMain.handle(CHANNELS.sitesRemove, (_e, id: string) => {
    labelStore.remove(id);
    return siteStore.remove(id);
  });

  ipcMain.handle(CHANNELS.sitesLabelsGet, (_e, siteId: string | null) => labelStore.get(siteId));
  ipcMain.handle(CHANNELS.sitesLabelsSave, (_e, siteId: string | null, labels: LabelImport) => {
    labelStore.save(siteId, labels);
  });

  ipcMain.handle(CHANNELS.setLevel, (_e, ref: GroupRef, level: number, rampSecs?: number) =>
    svc.setLevel(ref, level, rampSecs));
  ipcMain.handle(CHANNELS.terminateRamp, (_e, ref: GroupRef) => svc.terminateRamp(ref));
  ipcMain.handle(CHANNELS.fireScene, (_e, ref: GroupRef, actionSelector: number) =>
    svc.fireScene(ref, actionSelector));
  ipcMain.handle(CHANNELS.rename, (_e, ref: GroupRef, name: string) => svc.setName(ref, name));
  ipcMain.handle(CHANNELS.projectSave, () => svc.saveProject());
  ipcMain.handle(CHANNELS.projectName, () => svc.getProjectName());
  ipcMain.handle(CHANNELS.nodeDetail, (_e, ref: GroupRef) => svc.getGroupDetail(ref));
  ipcMain.handle(CHANNELS.serverStatus, () => svc.getServerStatus());
  ipcMain.handle(CHANNELS.groupParams, (_e, ref: GroupRef) => svc.getGroupParams(ref));
  ipcMain.handle(CHANNELS.unitParams, (_e, network: string, unit: string) => svc.getUnitParams(network, unit));
  ipcMain.handle(CHANNELS.setGroupParam, (_e, ref: GroupRef, param: string, value: string) =>
    svc.setGroupParam(ref, param, value));
  ipcMain.handle(CHANNELS.setUnitName, (_e, network: string, unit: string, name: string) =>
    svc.setUnitName(network, unit, name));

  // Open a native file picker for a C-Bus Toolkit project (.cbz) or raw project
  // .xml, then parse out its labels. Returns null when the user cancels. This is
  // a read-only enrichment: it never touches C-Gate.
  ipcMain.handle(CHANNELS.projectImport, async (): Promise<LabelImport | null> => {
    const win = getWindow();
    const result = win
      ? await dialog.showOpenDialog(win, openDialogOptions)
      : await dialog.showOpenDialog(openDialogOptions);
    const file = result.filePaths?.[0];
    if (result.canceled || !file) return null;
    return importLabelsFromFile(file);
  });

  // Write the current tree's labels to a Toolkit-compatible .xml or .cbz file.
  // The renderer passes the merged tree (live + imported + staged renames).
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

  return svc;
}
