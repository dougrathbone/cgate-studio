import { StringDecoder } from 'string_decoder';
import type { CgateConnection } from 'cgateweb/cgate-client';
import type { ActivityEntry, CommandResult } from '../shared/types';
import { isServiceReadyLine } from './cgateStatusParse';

const CMD_TIMEOUT_MS = 8000;
const CMD_TERMINAL = /^(\d{3}) /;
const CMD_ERROR_CODE = 400;

export type CommandChannelHooks = {
  onActivity: (entry: ActivityEntry) => void;
  onGreeting?: (line: string) => void;
};

/**
 * Serialized command/response exchanges on a single C-Gate command connection.
 * Owns the exclusive queue, line buffering, and activity log bookkeeping.
 */
export class CgateCommandChannel {
  private command: CgateConnection | null = null;
  private pendingCommands = new Set<() => void>();
  private commandBusy = false;
  private commandQueue: Array<() => void> = [];
  private commandBuf = '';
  private commandDecoder = new StringDecoder('utf8');
  private commandConsumer: ((line: string) => void) | null = null;
  private activitySeq = 0;
  private activityLog: ActivityEntry[] = [];
  private static readonly ACTIVITY_MAX = 200;

  constructor(private readonly hooks: CommandChannelHooks) {}

  setConnection(conn: CgateConnection | null): void {
    this.command = conn;
  }

  getConnection(): CgateConnection | null {
    return this.command;
  }

  resetBuffers(): void {
    this.commandBuf = '';
    this.commandDecoder = new StringDecoder('utf8');
    this.commandConsumer = null;
  }

  /** Cancel in-flight ops and clear the queue without flipping connection status. */
  teardown(): void {
    for (const cancel of [...this.pendingCommands]) cancel();
    this.pendingCommands.clear();
    this.commandQueue = [];
    this.commandBusy = false;
    this.commandConsumer = null;
    this.command?.disconnect();
    this.command = null;
    this.commandBuf = '';
  }

  getActivityLog(): ActivityEntry[] {
    return [...this.activityLog];
  }

  noteActivity(direction: ActivityEntry['direction'], text: string): void {
    const entry: ActivityEntry = {
      id: ++this.activitySeq,
      at: Date.now(),
      direction,
      text,
    };
    this.activityLog.push(entry);
    if (this.activityLog.length > CgateCommandChannel.ACTIVITY_MAX) {
      this.activityLog.splice(0, this.activityLog.length - CgateCommandChannel.ACTIVITY_MAX);
    }
    this.hooks.onActivity(entry);
  }

  onData(buf: Buffer): void {
    this.commandBuf += this.commandDecoder.write(buf);
    let idx;
    while ((idx = this.commandBuf.indexOf('\n')) !== -1) {
      const line = this.commandBuf.slice(0, idx).replace(/\r$/, '');
      this.commandBuf = this.commandBuf.slice(idx + 1);
      const consumer = this.commandConsumer;
      if (!consumer) {
        if (isServiceReadyLine(line)) this.hooks.onGreeting?.(line);
        continue;
      }
      try {
        consumer(line);
      } catch {
        /* consumers settle their own promises */
      }
    }
  }

  drainHandshake(quietMs = 120, maxMs = 1000): Promise<void> {
    return new Promise((resolve) => {
      let quietTimer: ReturnType<typeof setTimeout>;
      const done = () => {
        clearTimeout(quietTimer);
        clearTimeout(maxTimer);
        if (this.commandConsumer === drain) this.commandConsumer = null;
        resolve();
      };
      const arm = () => {
        clearTimeout(quietTimer);
        quietTimer = setTimeout(done, quietMs);
      };
      const drain = (line: string) => {
        if (isServiceReadyLine(line)) this.hooks.onGreeting?.(line);
        arm();
      };
      const maxTimer = setTimeout(done, maxMs);
      this.commandConsumer = drain;
      arm();
    });
  }

  sendCommand(cmd: string, opts?: { timeoutMs?: number }): Promise<CommandResult> {
    return this.runExclusive(() => this.sendCommandRaw(cmd, opts?.timeoutMs ?? CMD_TIMEOUT_MS));
  }

  runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        fn().then(resolve, reject).finally(() => {
          const next = this.commandQueue.shift();
          if (next) next();
          else this.commandBusy = false;
        });
      };
      if (this.commandBusy) this.commandQueue.push(run);
      else {
        this.commandBusy = true;
        run();
      }
    });
  }

  private sendCommandRaw(cmd: string, timeoutMs: number): Promise<CommandResult> {
    const conn = this.command;
    return new Promise<CommandResult>((resolve, reject) => {
      if (!conn) {
        reject(new Error('Not connected'));
        return;
      }
      const lines: string[] = [];
      let settled = false;
      let timer: ReturnType<typeof setTimeout>;
      let listIdle: ReturnType<typeof setTimeout> | null = null;

      const settle = (apply: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (listIdle) {
          clearTimeout(listIdle);
          listIdle = null;
        }
        if (this.commandConsumer === consume) this.commandConsumer = null;
        this.pendingCommands.delete(cancel);
        apply();
      };

      const isListItem = (line: string) =>
        (/^12[34]\s/i.test(line) && /project=/i.test(line)) ||
        (/^131\s/i.test(line) && /network=/i.test(line));

      const consume = (line: string) => {
        lines.push(line);
        if (isListItem(line)) {
          if (listIdle) clearTimeout(listIdle);
          const code = parseInt(line.slice(0, 3), 10);
          const text = line.slice(4);
          listIdle = setTimeout(() => {
            listIdle = null;
            this.noteActivity('rx', lines.join(' | '));
            settle(() => resolve({ code, text, lines: [...lines] }));
          }, 40);
          return;
        }
        if (!CMD_TERMINAL.test(line)) return;
        if (listIdle) {
          clearTimeout(listIdle);
          listIdle = null;
        }
        const code = parseInt(line.slice(0, 3), 10);
        const text = line.slice(4);
        if (code >= CMD_ERROR_CODE) {
          this.noteActivity('rx', lines.join(' | '));
          settle(() => reject(new Error(`C-Gate ${code}: ${text}`)));
        } else {
          this.noteActivity('rx', lines.join(' | '));
          settle(() => resolve({ code, text, lines: [...lines] }));
        }
      };

      const cancel = () => settle(() => reject(new Error('Disconnected during command')));

      timer = setTimeout(
        () => settle(() => reject(new Error(`Command timed out: ${cmd}`))),
        timeoutMs,
      );
      this.pendingCommands.add(cancel);
      this.commandConsumer = consume;
      this.noteActivity('tx', cmd);
      conn.send(`${cmd}\r\n`);
    });
  }

  /** Used by TREEXML fetch which needs a custom consumer under the mutex. */
  attachConsumer(consume: (line: string) => void, cancel: () => void): void {
    this.pendingCommands.add(cancel);
    this.commandConsumer = consume;
  }

  detachConsumer(consume: (line: string) => void, cancel: () => void): void {
    if (this.commandConsumer === consume) this.commandConsumer = null;
    this.pendingCommands.delete(cancel);
  }
}

export { CMD_TIMEOUT_MS };
