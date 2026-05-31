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
}

// A new site before the store has assigned it an id.
export type SiteInput = Omit<Site, 'id'>;

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
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
