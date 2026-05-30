import type { ConnectOptions, Tree, GroupState, ConnectionStatus } from '../shared/types';

interface CgateApi {
  connect(opts: ConnectOptions): Promise<void>;
  disconnect(): Promise<void>;
  getTree(network: string): Promise<Tree>;
  onStatus(cb: (s: ConnectionStatus) => void): () => void;
  onState(cb: (s: GroupState) => void): () => void;
}

declare global {
  interface Window { cgate: CgateApi; }
}

export const cgate = (): CgateApi => window.cgate;
