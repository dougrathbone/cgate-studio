declare module 'cgateweb/cgate-client' {
  import { EventEmitter } from 'events';

  export class CgateConnection extends EventEmitter {
    constructor(
      type: string,
      host: string,
      port: number,
      settings?: Record<string, unknown>,
    );
    connect(): this;
    disconnect(): void;
    send(data: string): boolean;
    connected: boolean;
    isDestroyed: boolean;
    socket: import('net').Socket | null;
  }

  export class CBusEvent {
    constructor(data: string | Buffer, options?: { statusDataOnly?: boolean });
    isValid(): boolean;
    isParsed(): boolean;
    getNetwork(): string | null;
    getApplication(): string | null;
    getGroup(): string | null;
    getAddress(): string | null;
    getAction(): string | null;
    getLevel(): number | null;
    getDeviceType(): string | null;
  }

  export const constants: {
    CGATE_CMD_EVENT_MODE_L6: string;
    CGATE_CMD_LOGIN: string;
    CGATE_RESPONSE_SYSTEM_EVENT: string;
    CGATE_RESPONSE_TREE_START: string;
    CGATE_RESPONSE_TREE_END: string;
    CGATE_CMD_TREEXML: string;
    CGATE_LEVEL_MAX: number;
    EVENT_REGEX: RegExp;
  };

  export class Logger {
    constructor(options?: Record<string, unknown>);
    _shouldLog(level?: string): boolean;
  }

  export function createLogger(options?: Record<string, unknown>): Logger;
  export function backoffDelay(
    retryNumber: number,
    options?: { jitter?: boolean; maxMs?: number; initialMs?: number },
  ): number;
}
