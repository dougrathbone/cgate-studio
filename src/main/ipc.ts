import { ipcMain, BrowserWindow } from 'electron';
import { CgateService } from './CgateService';
import type { ConnectOptions } from '../shared/types';

export const CHANNELS = {
  connect: 'cgate:connect',
  disconnect: 'cgate:disconnect',
  getTree: 'cgate:getTree',
  status: 'cgate:status',   // main -> renderer push
  state: 'cgate:state',     // main -> renderer push
} as const;

export function registerIpc(getWindow: () => BrowserWindow | null): CgateService {
  const svc = new CgateService();

  svc.on('status', (s) => getWindow()?.webContents.send(CHANNELS.status, s));
  svc.on('state', (st) => getWindow()?.webContents.send(CHANNELS.state, st));

  ipcMain.handle(CHANNELS.connect, (_e, opts: ConnectOptions) => svc.connect(opts));
  ipcMain.handle(CHANNELS.disconnect, () => svc.disconnect());
  ipcMain.handle(CHANNELS.getTree, (_e, network: string) => svc.getTree(network));

  return svc;
}
