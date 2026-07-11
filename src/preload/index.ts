import { contextBridge, ipcRenderer } from 'electron';
import type {
  ConnectOptions,
  Tree,
  GroupState,
  ConnectionStatus,
  Site,
  SiteInput,
  GroupRef,
  CommandResult,
  LabelImport,
  GroupDetail,
  LabelExportInput,
  LabelExportResult,
  TriggerActivity,
  TreeChange,
  MeasurementState,
  CgateNetworkInfo,
} from '../shared/types';
import type { CgateServerStatus, CgateProjectInfo } from '../shared/cgateStatus';
import type { CgateObjectParams } from '../shared/types';

const CH = {
  connect: 'cgate:connect',
  disconnect: 'cgate:disconnect',
  getTree: 'cgate:getTree',
  status: 'cgate:status',
  state: 'cgate:state',
  sitesList: 'sites:list',
  sitesAdd: 'sites:add',
  sitesUpdate: 'sites:update',
  sitesRemove: 'sites:remove',
  sitesLabelsGet: 'sites:labels:get',
  sitesLabelsSave: 'sites:labels:save',
  setLevel: 'control:setLevel',
  terminateRamp: 'control:terminateRamp',
  rename: 'labels:rename',
  projectSave: 'project:save',
  projectName: 'project:name',
  projectDir: 'project:dir',
  projectList: 'project:list',
  projectLoad: 'project:load',
  projectStart: 'project:start',
  projectUse: 'project:use',
  netList: 'net:list',
  projectImport: 'project:import',
  projectExport: 'project:export',
  nodeDetail: 'nodes:detail',
  networkLevels: 'nodes:networkLevels',
  serverStatus: 'cgate:serverStatus',
  groupParams: 'nodes:groupParams',
  unitParams: 'nodes:unitParams',
  setGroupParam: 'nodes:setGroupParam',
  setUnitName: 'nodes:setUnitName',
  fireScene: 'control:fireScene',
  trigger: 'cgate:trigger',
  treeChanged: 'cgate:treeChanged',
  measurement: 'cgate:measurement',
};

contextBridge.exposeInMainWorld('cgate', {
  connect: (opts: ConnectOptions): Promise<void> => ipcRenderer.invoke(CH.connect, opts),
  disconnect: (): Promise<void> => ipcRenderer.invoke(CH.disconnect),
  getTree: (network: string): Promise<Tree> => ipcRenderer.invoke(CH.getTree, network),
  getServerStatus: (): Promise<CgateServerStatus> => ipcRenderer.invoke(CH.serverStatus),
  onStatus: (cb: (s: ConnectionStatus) => void) => {
    const h = (_e: unknown, s: ConnectionStatus) => cb(s);
    ipcRenderer.on(CH.status, h);
    return () => ipcRenderer.removeListener(CH.status, h);
  },
  onState: (cb: (s: GroupState) => void) => {
    const h = (_e: unknown, s: GroupState) => cb(s);
    ipcRenderer.on(CH.state, h);
    return () => ipcRenderer.removeListener(CH.state, h);
  },
  onTrigger: (cb: (t: TriggerActivity) => void) => {
    const h = (_e: unknown, t: TriggerActivity) => cb(t);
    ipcRenderer.on(CH.trigger, h);
    return () => ipcRenderer.removeListener(CH.trigger, h);
  },
  onTreeChanged: (cb: (c: TreeChange) => void) => {
    const h = (_e: unknown, c: TreeChange) => cb(c);
    ipcRenderer.on(CH.treeChanged, h);
    return () => ipcRenderer.removeListener(CH.treeChanged, h);
  },
  onMeasurement: (cb: (m: MeasurementState) => void) => {
    const h = (_e: unknown, m: MeasurementState) => cb(m);
    ipcRenderer.on(CH.measurement, h);
    return () => ipcRenderer.removeListener(CH.measurement, h);
  },
  sites: {
    list: (): Promise<Site[]> => ipcRenderer.invoke(CH.sitesList),
    add: (input: SiteInput): Promise<Site[]> => ipcRenderer.invoke(CH.sitesAdd, input),
    update: (site: Site): Promise<Site[]> => ipcRenderer.invoke(CH.sitesUpdate, site),
    remove: (id: string): Promise<Site[]> => ipcRenderer.invoke(CH.sitesRemove, id),
    getImportedLabels: (siteId: string | null): Promise<LabelImport | null> =>
      ipcRenderer.invoke(CH.sitesLabelsGet, siteId),
    saveImportedLabels: (siteId: string | null, labels: LabelImport): Promise<void> =>
      ipcRenderer.invoke(CH.sitesLabelsSave, siteId, labels),
  },
  control: {
    setLevel: (ref: GroupRef, level: number, rampSecs?: number): Promise<CommandResult> =>
      ipcRenderer.invoke(CH.setLevel, ref, level, rampSecs),
    terminateRamp: (ref: GroupRef): Promise<CommandResult> =>
      ipcRenderer.invoke(CH.terminateRamp, ref),
    fireScene: (ref: GroupRef, actionSelector: number): Promise<CommandResult> =>
      ipcRenderer.invoke(CH.fireScene, ref, actionSelector),
  },
  labels: {
    rename: (ref: GroupRef, name: string): Promise<CommandResult> =>
      ipcRenderer.invoke(CH.rename, ref, name),
  },
  project: {
    save: (): Promise<CommandResult> => ipcRenderer.invoke(CH.projectSave),
    name: (): Promise<string> => ipcRenderer.invoke(CH.projectName),
    dir: (): Promise<CgateProjectInfo[]> => ipcRenderer.invoke(CH.projectDir),
    list: (): Promise<CgateProjectInfo[]> => ipcRenderer.invoke(CH.projectList),
    load: (name: string): Promise<CommandResult> => ipcRenderer.invoke(CH.projectLoad, name),
    start: (name: string): Promise<CommandResult> => ipcRenderer.invoke(CH.projectStart, name),
    use: (name: string): Promise<CommandResult> => ipcRenderer.invoke(CH.projectUse, name),
    import: (): Promise<LabelImport | null> => ipcRenderer.invoke(CH.projectImport),
    export: (input: LabelExportInput): Promise<LabelExportResult | null> =>
      ipcRenderer.invoke(CH.projectExport, input),
  },
  net: {
    list: (): Promise<CgateNetworkInfo[]> => ipcRenderer.invoke(CH.netList),
  },
  nodes: {
    getGroupDetail: (ref: GroupRef): Promise<GroupDetail> =>
      ipcRenderer.invoke(CH.nodeDetail, ref),
    getNetworkLevels: (network: string): Promise<Record<string, number>> =>
      ipcRenderer.invoke(CH.networkLevels, network),
    getGroupParams: (ref: GroupRef): Promise<CgateObjectParams> =>
      ipcRenderer.invoke(CH.groupParams, ref),
    getUnitParams: (network: string, unit: string): Promise<CgateObjectParams> =>
      ipcRenderer.invoke(CH.unitParams, network, unit),
    setGroupParam: (ref: GroupRef, param: string, value: string): Promise<CommandResult> =>
      ipcRenderer.invoke(CH.setGroupParam, ref, param, value),
    setUnitName: (network: string, unit: string, name: string): Promise<CommandResult> =>
      ipcRenderer.invoke(CH.setUnitName, network, unit, name),
  },
});
