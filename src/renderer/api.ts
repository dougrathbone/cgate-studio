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
  TriggerActivity,
  TreeChange,
  MeasurementState,
  CgateNetworkInfo,
  ActivityEntry,
  AppUpdateStatus,
} from '../shared/types';
import type { CgateServerStatus, CgateProjectInfo } from '../shared/cgateStatus';

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
  fireScene(ref: GroupRef, actionSelector: number): Promise<CommandResult>;
}

interface LabelsApi {
  rename(ref: GroupRef, name: string): Promise<CommandResult>;
  clear(ref: GroupRef): Promise<CommandResult>;
}

interface ProjectApi {
  save(): Promise<CommandResult>;
  name(): Promise<string>;
  dir(): Promise<CgateProjectInfo[]>;
  list(): Promise<CgateProjectInfo[]>;
  load(name: string): Promise<CommandResult>;
  start(name: string): Promise<CommandResult>;
  use(name: string): Promise<CommandResult>;
  import(): Promise<LabelImport | null>;
  export(input: LabelExportInput): Promise<LabelExportResult | null>;
}

interface NetApi {
  list(): Promise<CgateNetworkInfo[]>;
  open(network: string): Promise<CommandResult>;
  close(network: string): Promise<CommandResult>;
  sync(network: string): Promise<CommandResult>;
  health(network: string): Promise<CgateNetworkInfo>;
}

interface ActivityApi {
  list(): Promise<ActivityEntry[]>;
}

interface NodesApi {
  getGroupDetail(ref: GroupRef): Promise<GroupDetail>;
  getNetworkLevels(network: string, applications?: string[]): Promise<Record<string, number>>;
  identifyUnit(network: string, unit: string): Promise<CommandResult>;
  getGroupParams(ref: GroupRef): Promise<CgateObjectParams>;
  getUnitParams(network: string, unit: string): Promise<CgateObjectParams>;
  setGroupParam(ref: GroupRef, param: string, value: string): Promise<CommandResult>;
  setUnitName(network: string, unit: string, name: string): Promise<CommandResult>;
}

interface UpdatesApi {
  check(): Promise<void>;
  quitAndInstall(): Promise<void>;
}

interface CgateApi {
  connect(opts: ConnectOptions): Promise<void>;
  disconnect(): Promise<void>;
  getTree(network: string): Promise<Tree>;
  getServerStatus(): Promise<CgateServerStatus>;
  onStatus(cb: (s: ConnectionStatus) => void): () => void;
  onState(cb: (s: GroupState) => void): () => void;
  onTrigger(cb: (t: TriggerActivity) => void): () => void;
  onTreeChanged(cb: (c: TreeChange) => void): () => void;
  onMeasurement(cb: (m: MeasurementState) => void): () => void;
  onActivity(cb: (a: ActivityEntry) => void): () => void;
  onUpdate?(cb: (s: AppUpdateStatus) => void): () => void;
  sites: SitesApi;
  control: ControlApi;
  labels: LabelsApi;
  project: ProjectApi;
  net: NetApi;
  activity: ActivityApi;
  nodes: NodesApi;
  updates?: UpdatesApi;
}

declare global {
  interface Window { cgate: CgateApi; }
}

export const cgate = (): CgateApi => window.cgate;
