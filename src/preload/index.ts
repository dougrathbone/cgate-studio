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
} from '../shared/types';

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
  setLevel: 'control:setLevel',
  terminateRamp: 'control:terminateRamp',
  rename: 'labels:rename',
  projectSave: 'project:save',
  projectName: 'project:name',
  projectImport: 'project:import',
  nodeDetail: 'nodes:detail',
};

contextBridge.exposeInMainWorld('cgate', {
  connect: (opts: ConnectOptions): Promise<void> => ipcRenderer.invoke(CH.connect, opts),
  disconnect: (): Promise<void> => ipcRenderer.invoke(CH.disconnect),
  getTree: (network: string): Promise<Tree> => ipcRenderer.invoke(CH.getTree, network),
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
  sites: {
    list: (): Promise<Site[]> => ipcRenderer.invoke(CH.sitesList),
    add: (input: SiteInput): Promise<Site[]> => ipcRenderer.invoke(CH.sitesAdd, input),
    update: (site: Site): Promise<Site[]> => ipcRenderer.invoke(CH.sitesUpdate, site),
    remove: (id: string): Promise<Site[]> => ipcRenderer.invoke(CH.sitesRemove, id),
  },
  control: {
    setLevel: (ref: GroupRef, level: number, rampSecs?: number): Promise<CommandResult> =>
      ipcRenderer.invoke(CH.setLevel, ref, level, rampSecs),
    terminateRamp: (ref: GroupRef): Promise<CommandResult> =>
      ipcRenderer.invoke(CH.terminateRamp, ref),
  },
  labels: {
    rename: (ref: GroupRef, name: string): Promise<CommandResult> =>
      ipcRenderer.invoke(CH.rename, ref, name),
  },
  project: {
    save: (): Promise<CommandResult> => ipcRenderer.invoke(CH.projectSave),
    name: (): Promise<string> => ipcRenderer.invoke(CH.projectName),
    import: (): Promise<LabelImport | null> => ipcRenderer.invoke(CH.projectImport),
  },
  nodes: {
    getGroupDetail: (ref: GroupRef): Promise<GroupDetail> =>
      ipcRenderer.invoke(CH.nodeDetail, ref),
  },
});
