import type { ConnectionStatus } from './types';

export interface CgateProjectInfo {
  name: string;
  state: string | null;
}

/** Live status queried from the connected C-Gate server. */
export interface CgateServerStatus {
  connection: ConnectionStatus;
  host: string | null;
  commandPort: number | null;
  eventPort: number | null;
  commandConnected: boolean;
  eventConnected: boolean;
  /** Parsed from the connect greeting, e.g. "v2.8.0 (build 2307)". */
  serverVersion: string | null;
  /** Raw 201 Service ready line from C-Gate, when captured. */
  serverGreeting: string | null;
  /** The project CBus Studio is addressing (from PROJECT LIST / cache). */
  activeProject: CgateProjectInfo | null;
  /** Projects currently loaded in C-Gate (PROJECT LIST). */
  loadedProjects: CgateProjectInfo[];
  /** Project files found in the tag directory (PROJECT DIR). */
  projectsOnDisk: CgateProjectInfo[];
}
