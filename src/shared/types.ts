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
  label: string | null;
  groups: GroupNode[];
}

export interface NetworkNode {
  kind: 'network';
  address: string;        // "254"
  label: string | null;
  applications: AppNode[];
}

export type Tree = NetworkNode[];

export interface GroupState {
  address: string;        // "254/56/4"
  level: number;          // 0-255
  on: boolean;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
