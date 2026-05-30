export interface ConnectOptions {
  host: string;
  commandPort: number; // default 20023
  eventPort: number;   // default 20025
  project?: string;
  username?: string;
  password?: string;
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
