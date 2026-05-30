import type {
  ConnectOptions,
  Tree,
  GroupState,
  ConnectionStatus,
  Site,
  SiteInput,
} from '../shared/types';

interface SitesApi {
  list(): Promise<Site[]>;
  add(input: SiteInput): Promise<Site[]>;
  update(site: Site): Promise<Site[]>;
  remove(id: string): Promise<Site[]>;
}

interface CgateApi {
  connect(opts: ConnectOptions): Promise<void>;
  disconnect(): Promise<void>;
  getTree(network: string): Promise<Tree>;
  onStatus(cb: (s: ConnectionStatus) => void): () => void;
  onState(cb: (s: GroupState) => void): () => void;
  sites: SitesApi;
}

declare global {
  interface Window { cgate: CgateApi; }
}

export const cgate = (): CgateApi => window.cgate;
