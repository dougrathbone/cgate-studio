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
  CgateObjectParams,
} from '../shared/types';
import type { CgateServerStatus } from '../shared/cgateStatus';

interface SitesApi {
  list(): Promise<Site[]>;
  add(input: SiteInput): Promise<Site[]>;
  update(site: Site): Promise<Site[]>;
  remove(id: string): Promise<Site[]>;
  getImportedLabels(siteId: string | null): Promise<LabelImport | null>;
  saveImportedLabels(siteId: string | null, labels: LabelImport): Promise<void>;
}

interface ControlApi {
  setLevel(ref: GroupRef, level: number, rampSecs?: number): Promise<CommandResult>;
  terminateRamp(ref: GroupRef): Promise<CommandResult>;
}

interface LabelsApi {
  rename(ref: GroupRef, name: string): Promise<CommandResult>;
}

interface ProjectApi {
  save(): Promise<CommandResult>;
  name(): Promise<string>;
  import(): Promise<LabelImport | null>;
  export(input: LabelExportInput): Promise<LabelExportResult | null>;
}

interface NodesApi {
  getGroupDetail(ref: GroupRef): Promise<GroupDetail>;
  getGroupParams(ref: GroupRef): Promise<CgateObjectParams>;
  getUnitParams(network: string, unit: string): Promise<CgateObjectParams>;
  setGroupParam(ref: GroupRef, param: string, value: string): Promise<CommandResult>;
  setUnitName(network: string, unit: string, name: string): Promise<CommandResult>;
}

interface CgateApi {
  connect(opts: ConnectOptions): Promise<void>;
  disconnect(): Promise<void>;
  getTree(network: string): Promise<Tree>;
  getServerStatus(): Promise<CgateServerStatus>;
  onStatus(cb: (s: ConnectionStatus) => void): () => void;
  onState(cb: (s: GroupState) => void): () => void;
  sites: SitesApi;
  control: ControlApi;
  labels: LabelsApi;
  project: ProjectApi;
  nodes: NodesApi;
}

declare global {
  interface Window { cgate: CgateApi; }
}

export const cgate = (): CgateApi => window.cgate;
