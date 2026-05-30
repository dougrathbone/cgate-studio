import { ipcMain, BrowserWindow } from 'electron';
import { CgateService } from './CgateService';
import { SiteStore } from './SiteStore';
import type { ConnectOptions, Site, SiteInput } from '../shared/types';

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
} as const;

export function registerIpc(
  getWindow: () => BrowserWindow | null,
  siteStore: SiteStore,
): CgateService {
  const svc = new CgateService();

  svc.on('status', (s) => getWindow()?.webContents.send(CHANNELS.status, s));
  svc.on('state', (st) => getWindow()?.webContents.send(CHANNELS.state, st));

  ipcMain.handle(CHANNELS.connect, (_e, opts: ConnectOptions) => svc.connect(opts));
  ipcMain.handle(CHANNELS.disconnect, () => svc.disconnect());
  ipcMain.handle(CHANNELS.getTree, (_e, network: string) => svc.getTree(network));

  ipcMain.handle(CHANNELS.sitesList, () => siteStore.list());
  ipcMain.handle(CHANNELS.sitesAdd, (_e, input: SiteInput) => siteStore.add(input));
  ipcMain.handle(CHANNELS.sitesUpdate, (_e, site: Site) => siteStore.update(site));
  ipcMain.handle(CHANNELS.sitesRemove, (_e, id: string) => siteStore.remove(id));

  return svc;
}
