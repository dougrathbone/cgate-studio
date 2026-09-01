export interface ConnectOptions {
  host: string;
  commandPort: number; // default 20023
  eventPort: number;   // default 20025
  project?: string;
  username?: string;
  password?: string;
}

// A saved C-Gate connection ("site"). Installers can store one per location so
// they can switch between multiple C-Gate servers without re-typing host/ports.
export interface Site {
  id: string;          // stable uuid, assigned by the store
  name: string;        // human label, e.g. "Smith residence"
  host: string;
  commandPort: number;
  eventPort: number;
  /** Optional C-Gate LOGIN credentials (sent only over the command channel). */
  username?: string;
  password?: string;
  /** Preferred project to load/use after connect, when present on the server. */
  defaultProject?: string;
  /** Preferred network address (e.g. "254") after project is active. */
  defaultNetwork?: string;
}

// A new site before the store has assigned it an id.
export type SiteInput = Omit<Site, 'id'>;

/** A network entry from NET LIST. */
export interface CgateNetworkInfo {
  address: string;
  state?: string | null;
  interfaceState?: string | null;
  syncState?: string | null;
}

/** Active session selection after connect (project + networks). */
export interface SessionInfo {
  projectName: string | null;
  networks: CgateNetworkInfo[];
  activeNetwork: string | null;
}

/** A command/response line captured for the activity drawer (M7). */
export interface ActivityEntry {
  id: number;
  at: number; // Date.now()
  direction: 'tx' | 'rx' | 'info';
  text: string;
}

/** True when lighting commands should append FORCE (unsynced / new network). */
export function networkNeedsForce(info: Pick<CgateNetworkInfo, 'state' | 'syncState'> | null | undefined): boolean {
  if (!info) return false;
  const state = (info.state ?? '').toLowerCase();
  const sync = (info.syncState ?? '').toLowerCase();
  if (state === 'new') return true;
  if (sync && sync !== 'idle' && sync !== 'ok' && sync !== 'synced') return true;
  return false;
}

export interface GroupNode {
  kind: 'group';
  address: string;        // "254/56/4"
  network: string;
  application: string;
  group: string;
  label: string | null;
}

export interface AppNode {
  kind: 'application';
  address: string;        // application id, e.g. "56"
  label: string | null;   // resolved name, e.g. "Lighting", when known
  groups: GroupNode[];
}

// A physical device on the network (a C-Bus "unit"), as reported by TREEXML.
export interface UnitNode {
  kind: 'unit';
  address: string;            // unit address on the network, e.g. "12"
  name: string | null;        // the unit's tag/part name, e.g. "KITCHEN"
  type: string | null;        // model/catalogue, e.g. "DIMDC8", "RELDN12"
  category: string | null;    // friendly device class, e.g. "Dimmer", "Relay"
  firmware: string | null;    // firmware version
  serial: string | null;      // serial number
  applications: string[];     // application addresses the unit participates in
  groups: string[];           // group addresses the unit drives/monitors
}

export interface NetworkNode {
  kind: 'network';
  address: string;        // "254"
  label: string | null;
  applications: AppNode[];
  units: UnitNode[];
}

export type Tree = NetworkNode[];

export interface GroupState {
  address: string;        // "254/56/4"
  level: number;          // 0-255
  on: boolean;
  ramping?: boolean;      // true while a ramp is in progress (drives the Stop control)
}

// A C-Bus Measurement-application (228) reading observed on the event stream.
// Read-only: sensors report values (temperature, light level, etc.); we never
// write to a measurement channel.
export interface MeasurementState {
  address: string;        // "254/228/1" (network/application/channel)
  network: string;
  application: string;    // "228"
  channel: string;
  value: number;
  units: string | null;   // raw units token/code when present, else null
}

// A trigger-control (application 202) event observed on the event stream. The
// trigger application has no persisted resting state — this records the most
// recent action selector seen for a trigger group, used for a transient
// "last fired" indicator in the UI.
export interface TriggerActivity {
  address: string;        // "254/202/1"
  network: string;
  application: string;
  group: string;
  actionSelector: number; // the selector value carried by the event (0-255)
}

// A C-Gate `742` async object event (e.g. an object created/renamed/removed by
// another client). The renderer reconciles by re-fetching the affected network.
// `network` is the parsed network address when one is present in the line.
// VALIDATE@live-cgate: confirm the exact 742 line format on live C-Gate.
export interface TreeChange {
  network: string | null;
  raw: string;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

/** Main workspace mode: browse/control tree vs commission tables. */
export type UiMode = 'operate' | 'commission';

/** Main-process connect() was replaced by a newer connect/disconnect. */
export const CONNECTION_SUPERSEDED = 'Connection superseded';

// Identifies a single group on the network, used to address control / rename
// commands (built into a C-Gate path like "//PROJECT/254/56/4").
export interface GroupRef {
  network: string;
  application: string;
  group: string;
}

// Per-group detail fetched lazily from C-Gate after the initial tree loads:
// the project-DB tag name and the current live level. Either may be null when
// the install has no tag database / the object is unset.
export interface GroupDetail {
  label: string | null;
  level: number | null;
}

// The outcome of a C-Gate command sent on the command connection. `code` is the
// 3-digit response code (2xx/3xx success, 4xx/5xx error); `text` is the final
// response line minus its code.
export interface CommandResult {
  code: number;
  text: string;
  lines: string[];
}

// Labels imported from a Clipsal C-Bus Toolkit project file (.cbz archive or the
// raw project .xml). Maps are keyed by C-Bus address so they can be overlaid on
// the live tree: networks by "254", applications by "254/56", groups by the full
// "254/56/4". This is a display-only enrichment — it never writes to C-Gate.
export interface LabelImport {
  source: string;                          // original filename, e.g. "5COGAN.cbz"
  networks: Record<string, string>;        // "254" -> "Local Network"
  applications: Record<string, string>;    // "254/56" -> "Lighting"
  groups: Record<string, string>;          // "254/56/4" -> "Kitchen"
  stats: { networkCount: number; groupCount: number; labelCount: number };
}

// Input for exporting the current tree as a C-Bus Toolkit-compatible tag-database
// XML (.xml) or zipped project (.cbz). Read-only — never writes to C-Gate.
export interface LabelExportInput {
  tree: Tree;
  projectName?: string | null;
}

export interface LabelExportResult {
  path: string;
  stats: {
    networkCount: number;
    groupCount: number;
    labelCount: number;
    unitCount: number;
  };
}

/** A node selected in the device tree for the detail panel. */
export type TreeSelection =
  | { kind: 'group'; group: GroupNode }
  | { kind: 'unit'; network: string; unit: UnitNode };

/** Parameters returned by `GET //…/path *` on the C-Gate command channel. */
export type CgateObjectParams = Record<string, string>;

/** Auto-update progress pushed from the main process (packaged builds only). */
export type AppUpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'not-available'
  | 'error'
  | 'dev';

export interface AppUpdateStatus {
  state: AppUpdateState;
  version?: string;
  percent?: number;
  message?: string;
}
