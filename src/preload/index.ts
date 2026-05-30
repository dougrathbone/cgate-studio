import { contextBridge, ipcRenderer } from 'electron';
import type {
  ConnectOptions,
  Tree,
  GroupState,
  ConnectionStatus,
  Site,
  SiteInput,
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
});
