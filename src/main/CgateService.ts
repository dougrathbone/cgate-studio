import { EventEmitter } from 'events';
import { StringDecoder } from 'string_decoder';
import type {
  ConnectOptions,
  Tree,
  GroupState,
  ConnectionStatus,
  GroupRef,
  CommandResult,
  GroupDetail,
} from '../shared/types';

// Use ES imports (not require) so the bundler inlines the vendored client into
// the main-process bundle; otherwise the relative requires resolve against
// out/main/ at runtime and fail (Electron: "Cannot find module ...").
import CgateConnection from '../cgate-client/cgateConnection';
import CBusEvent from '../cgate-client/cbusEvent';
import { parseTreeXml } from '../cgate-client/treexml';

const TREE_START = /^343/m;
const TREE_END = /^344[ \t]/m;
const TREE_TIMEOUT_MS = 10000;
const CMD_TIMEOUT_MS = 8000;
// A response line is terminal when the 3-digit code is followed by a space;
// continuation lines use "CODE-". Codes >= 400 indicate an error.
const CMD_TERMINAL = /^(\d{3}) /;
const CMD_ERROR_CODE = 400;

export class CgateService extends EventEmitter {
  private command: any = null;
  private event: any = null;
  private status: ConnectionStatus = 'disconnected';
  // Cancel callbacks for the in-flight command-channel op (getTree / sendCommand)
  // so disconnect() can settle it promptly instead of leaving a hung promise /
  // leaked timer (I3). Each op registers its own canceller with its own message.
  private pendingCommands = new Set<() => void>();
  // The loaded C-Gate project name (e.g. "5COGAN"), needed to build command
  // paths like //PROJECT/254/56/4. Resolved lazily from PROJECT LIST (or taken
  // from ConnectOptions.project) and cached for the life of the connection.
  private projectName: string | null = null;
  // Serialize command/response exchanges on the single command connection so
  // their replies can't interleave. Each entry runs to completion before the
  // next starts.
  private commandBusy = false;
  private commandQueue: Array<() => void> = [];
  // Single persistent reader for the command connection. Complete lines are fed
  // to the active consumer (a getTree or sendCommand in progress); lines that
  // arrive with no active consumer (the connect greeting, the EVENT ON / LOGIN
  // acks, stray async output) are discarded so they can't contaminate the next
  // command's response. A StringDecoder ensures multibyte UTF-8 characters split
  // across socket chunks aren't corrupted (M6).
  private commandBuf = '';
  private commandDecoder = new StringDecoder('utf8');
  private commandConsumer: ((line: string) => void) | null = null;
  // Event-stream line assembly: buffer partial lines across chunks and decode
  // with a StringDecoder so split multibyte characters survive (M6).
  private eventBuf = '';
  private eventDecoder = new StringDecoder('utf8');
  // Per-address timers that clear a group's transient `ramping` flag if no
  // settling (on/off/level) event arrives. C-Gate emits a `ramp` event when a
  // ramp starts but not always a clean "finished" one, so this backstop ensures
  // the Stop control can never get stuck visible.
  private rampTimers = new Map<string, ReturnType<typeof setTimeout>>();

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.emit('status', s);
  }

  // Re-emit socket errors as our own 'error' event, but only when something is
  // listening. EventEmitter throws on an 'error' emit with no listener, which
  // in the Electron main process would crash it; the IPC layer only subscribes
  // to status/state, so a transient socket error must never be fatal (C1).
  private safeEmitError(e: Error) {
    this.setStatus('error');
    if (this.listenerCount('error') > 0) this.emit('error', e);
  }

  async connect(opts: ConnectOptions): Promise<void> {
    // Re-connect safety: the Connect action stays enabled, so connect() can be
    // called again on an already-connected service. Tear down the prior pair
    // first (destroys sockets, removes listeners, clears self-reconnect, nulls
    // them, settles any in-flight getTree) so we never orphan the old event
    // connection (double 'state' emits) or leak the old command socket.
    if (this.command || this.event) {
      await this.disconnect();
    }
    this.setStatus('connecting');
    // Prefer an explicitly configured project; otherwise discover it lazily.
    this.projectName = opts.project ?? null;
    this.command = new CgateConnection('command', opts.host, opts.commandPort, {
      cgateusername: opts.username,
      cgatepassword: opts.password,
    });
    this.event = new CgateConnection('event', opts.host, opts.eventPort, {});

    this.commandBuf = '';
    this.commandDecoder = new StringDecoder('utf8');
    this.commandConsumer = null;
    this.eventBuf = '';
    this.eventDecoder = new StringDecoder('utf8');
    this.command.on('data', (buf: Buffer) => this.onCommandData(buf));
    this.event.on('data', (buf: Buffer) => this.handleEventData(buf));
    // Both connections need a persistent error listener: CgateConnection emits
    // 'error' on socket failures at any time, and an unhandled emit would crash
    // the process (C1/C2). Route both through safeEmitError.
    this.command.on('error', (e: Error) => this.safeEmitError(e));
    this.event.on('error', (e: Error) => this.safeEmitError(e));
    this.event.on('close', () => this.setStatus('reconnecting'));

    try {
      await Promise.all([
        this.waitForConnect(this.command),
        this.waitForConnect(this.event),
      ]);
    } catch (e) {
      // Partial-connect failure: tear down BOTH connections so the side that
      // did connect isn't orphaned and the failed side doesn't self-reconnect
      // (poolIndex < 0). Leave a definitive status, then rethrow (I4).
      this.command?.disconnect();
      this.event?.disconnect();
      this.command = null;
      this.event = null;
      this.setStatus('error');
      throw e;
    }
    // Drain the command-connection handshake (greeting + EVENT ON / LOGIN acks)
    // before allowing commands, so those unsolicited responses can't be
    // mistaken for the reply to the first command we send.
    await this.drainHandshake();
    this.setStatus('connected');
  }

  // Consume and discard command-stream lines until the stream goes quiet,
  // bounded by a hard cap. Used once after connect to swallow the greeting and
  // the EVENT ON / LOGIN acknowledgements.
  private drainHandshake(quietMs = 120, maxMs = 1000): Promise<void> {
    return new Promise((resolve) => {
      let quietTimer: ReturnType<typeof setTimeout>;
      const done = () => {
        clearTimeout(quietTimer);
        clearTimeout(maxTimer);
        if (this.commandConsumer === drain) this.commandConsumer = null;
        resolve();
      };
      const arm = () => { clearTimeout(quietTimer); quietTimer = setTimeout(done, quietMs); };
      const drain = () => arm();
      const maxTimer = setTimeout(done, maxMs);
      this.commandConsumer = drain;
      arm();
    });
  }

  private waitForConnect(conn: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const onConnect = () => { cleanup(); resolve(); };
      const onError = (e: Error) => { cleanup(); reject(e); };
      const cleanup = () => { conn.off('connect', onConnect); conn.off('error', onError); };
      conn.on('connect', onConnect);
      conn.on('error', onError);
      conn.connect();
    });
  }

  // Persistent command-stream reader: split into complete lines and hand each
  // to the active consumer; discard lines that arrive with no consumer.
  private onCommandData(buf: Buffer) {
    this.commandBuf += this.commandDecoder.write(buf);
    let idx;
    while ((idx = this.commandBuf.indexOf('\n')) !== -1) {
      const line = this.commandBuf.slice(0, idx).replace(/\r$/, '');
      this.commandBuf = this.commandBuf.slice(idx + 1);
      const consumer = this.commandConsumer;
      if (!consumer) continue; // unsolicited greeting / ack / async — discard
      // A consumer must never throw out of here (socket 'data' event) or it
      // would crash the main process.
      try {
        consumer(line);
      } catch {
        /* consumers settle their own promises; swallow to protect the process */
      }
    }
  }

  // Request the TREEXML for a network, accumulating response lines until the
  // 344 terminator, then parse the 343/347 payload into a Tree. Runs through the
  // command mutex (M5) so it can't interleave with other command-channel ops.
  getTree(network: string): Promise<Tree> {
    return this.runExclusive(() => new Promise<Tree>((resolve, reject) => {
      const conn = this.command;
      if (!conn) {
        reject(new Error('Not connected'));
        return;
      }
      const lines: string[] = [];
      let settled = false;
      let timer: ReturnType<typeof setTimeout>;

      const settle = (apply: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (this.commandConsumer === consume) this.commandConsumer = null;
        this.pendingCommands.delete(cancel);
        apply();
      };

      const consume = (line: string) => {
        lines.push(line);
        if (!TREE_END.test(line)) return;
        const startIdx = lines.findIndex((l) => TREE_START.test(l));
        const frame = (startIdx === -1 ? lines : lines.slice(startIdx)).join('\n');
        parseTreeXml(frame, network).then(
          (tree) => settle(() => resolve(tree as Tree)),
          (err: Error) => settle(() => reject(err)),
        );
      };

      // Invoked by disconnect() to reject this getTree without leaking the
      // timer/consumer (I3).
      const cancel = () => settle(() => reject(new Error('Disconnected during getTree')));

      timer = setTimeout(() => settle(() => reject(new Error('TREEXML timed out'))), TREE_TIMEOUT_MS);
      this.pendingCommands.add(cancel);
      this.commandConsumer = consume;
      conn.send(`TREEXML ${network}\r\n`);
    }));
  }

  // --- Command/response (M2 control, M3 rename) -----------------------------

  // Send a single command on the command connection and resolve with its parsed
  // response. Calls are serialized (see commandQueue) so concurrent commands
  // never interleave their replies on the shared stream.
  sendCommand(cmd: string): Promise<CommandResult> {
    return this.runExclusive(() => this.sendCommandRaw(cmd));
  }

  private runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        fn().then(resolve, reject).finally(() => {
          const next = this.commandQueue.shift();
          if (next) next();
          else this.commandBusy = false;
        });
      };
      if (this.commandBusy) this.commandQueue.push(run);
      else { this.commandBusy = true; run(); }
    });
  }

  private sendCommandRaw(cmd: string): Promise<CommandResult> {
    const conn = this.command;
    return new Promise<CommandResult>((resolve, reject) => {
      if (!conn) { reject(new Error('Not connected')); return; }
      const lines: string[] = [];
      let settled = false;
      let timer: ReturnType<typeof setTimeout>;

      const settle = (apply: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (this.commandConsumer === consume) this.commandConsumer = null;
        this.pendingCommands.delete(cancel);
        apply();
      };

      // Collect response lines until a terminal one ("CODE "); continuation
      // lines ("CODE-") accumulate first. List commands (PROJECT LIST/DIR) emit
      // multiple "123 project=..." lines before the final status.
      const isListItem = (line: string) => /^12[34]\s/i.test(line) && /project=/i.test(line);
      const consume = (line: string) => {
        lines.push(line);
        if (isListItem(line)) return;
        if (!CMD_TERMINAL.test(line)) return;
        const code = parseInt(line.slice(0, 3), 10);
        const text = line.slice(4);
        if (code >= CMD_ERROR_CODE) settle(() => reject(new Error(`C-Gate ${code}: ${text}`)));
        else settle(() => resolve({ code, text, lines: [...lines] }));
      };

      const cancel = () => settle(() => reject(new Error('Disconnected during command')));

      timer = setTimeout(() => settle(() => reject(new Error(`Command timed out: ${cmd}`))), CMD_TIMEOUT_MS);
      this.pendingCommands.add(cancel);
      this.commandConsumer = consume;
      conn.send(`${cmd}\r\n`);
    });
  }

  // Resolve (and cache) the C-Gate project name. Parses `project=<name>` from a
  // PROJECT LIST response. Returns '' if none could be determined.
  async getProjectName(): Promise<string> {
    if (this.projectName != null) return this.projectName;
    try {
      const res = await this.sendCommand('PROJECT LIST');
      const m = res.lines.join('\n').match(/project=(\S+)/i);
      this.projectName = m ? m[1] : '';
    } catch {
      this.projectName = '';
    }
    return this.projectName;
  }

  private async groupPath(ref: GroupRef): Promise<string> {
    const project = await this.getProjectName();
    const prefix = project ? `//${project}/` : '//';
    return `${prefix}${ref.network}/${ref.application}/${ref.group}`;
  }

  // Set a group's level (0-255). 0 => OFF (instant), 255 with no ramp => ON
  // (instant), anything else => RAMP to that level, optionally over rampSecs.
  async setLevel(ref: GroupRef, level: number, rampSecs?: number): Promise<CommandResult> {
    const path = await this.groupPath(ref);
    const lv = Math.max(0, Math.min(255, Math.round(level)));
    let cmd: string;
    if (lv <= 0) cmd = `OFF ${path}`;
    else if (lv >= 255 && rampSecs == null) cmd = `ON ${path}`;
    else cmd = `RAMP ${path} ${lv}${rampSecs != null ? ` ${rampSecs}s` : ''}`;
    return this.sendCommand(cmd);
  }

  async terminateRamp(ref: GroupRef): Promise<CommandResult> {
    return this.sendCommand(`TERMINATERAMP ${await this.groupPath(ref)}`);
  }

  // Lazily fetch a group's project-DB tag name and current level, used to enrich
  // the tree node-by-node after the initial load. Each query is independent and
  // guarded: a missing tag DB or an unsupported parameter yields null rather than
  // failing the whole detail fetch. Runs over the serialized command channel.
  async getGroupDetail(ref: GroupRef): Promise<GroupDetail> {
    const path = await this.groupPath(ref);
    let label: string | null = null;
    let level: number | null = null;

    try {
      const res = await this.sendCommand(`DBGET ${path} TagName`);
      const m = res.lines.join('\n').match(/TagName="([^"]*)"/i);
      const tag = m?.[1]?.trim();
      // C-Gate uses "<Unused>" (and blanks) for groups with no real label.
      label = tag && tag !== '<Unused>' ? tag : null;
    } catch {
      // No tag DB / object not in DB — leave label null.
    }

    try {
      const res = await this.sendCommand(`GET ${path} level`);
      const m = res.lines.join('\n').match(/level=(\d+)/i);
      if (m) level = Number(m[1]);
    } catch {
      // level not queryable — leave null.
    }

    return { label, level };
  }

  // Rename a group's label by setting its `Name` parameter in the project DB.
  // This is an in-memory change on the C-Gate server until saveProject() runs.
  async setName(ref: GroupRef, name: string): Promise<CommandResult> {
    const path = await this.groupPath(ref);
    const clean = name.replace(/[\r\n]/g, ' ').trim();
    return this.sendCommand(`SET ${path} Name ${clean}`);
  }

  // Persist project DB changes (e.g. renamed labels) to disk. The only command
  // that writes to the project — gated behind explicit confirmation in the UI.
  async saveProject(): Promise<CommandResult> {
    const project = await this.getProjectName();
    return this.sendCommand(`PROJECT SAVE${project ? ` ${project}` : ''}`);
  }

  private handleEventData(buf: Buffer) {
    // Buffer partial lines across chunks and decode with StringDecoder so a line
    // (or a multibyte character) split across TCP packets parses correctly (M6).
    this.eventBuf += this.eventDecoder.write(buf);
    let idx;
    while ((idx = this.eventBuf.indexOf('\n')) !== -1) {
      const line = this.eventBuf.slice(0, idx).replace(/\r$/, '');
      this.eventBuf = this.eventBuf.slice(idx + 1);
      if (!line.trim()) continue;
      // Parse/emit per line under a guard: this runs on a socket 'data' event,
      // so a single malformed line (or a throwing 'state' listener) must not
      // escape as an uncaught exception and crash the main process.
      try {
        const evt = new CBusEvent(line);
        if (!evt.isValid()) continue;
        const level = evt.getLevel() ?? (evt.getAction() === 'on' ? 255 : 0);
        const address = `${evt.getNetwork()}/${evt.getApplication()}/${evt.getGroup()}`;
        const ramping = evt.getAction() === 'ramp';
        this.emit('state', { address, level, on: level > 0, ramping });
        this.trackRamp(address, level, ramping);
      } catch {
        // Ignore an individual bad event line and keep processing the rest.
      }
    }
  }

  // Manage the safety timer for a group's `ramping` flag. A fresh `ramp` event
  // (re)arms the timer; a settling event clears it. If the timer fires, emit a
  // final non-ramping state so the UI drops the Stop control.
  private static readonly RAMP_SETTLE_MS = 12000;
  private trackRamp(address: string, level: number, ramping: boolean) {
    const existing = this.rampTimers.get(address);
    if (existing) clearTimeout(existing);
    if (!ramping) {
      this.rampTimers.delete(address);
      return;
    }
    this.rampTimers.set(
      address,
      setTimeout(() => {
        this.rampTimers.delete(address);
        this.emit('state', { address, level, on: level > 0, ramping: false });
      }, CgateService.RAMP_SETTLE_MS),
    );
  }

  private clearRampTimers() {
    for (const t of this.rampTimers.values()) clearTimeout(t);
    this.rampTimers.clear();
  }

  async disconnect(): Promise<void> {
    // Settle any in-flight command-channel op (getTree / sendCommand) first so
    // callers don't hang and no timer/listener leaks once the connection is
    // gone (I3).
    for (const cancel of [...this.pendingCommands]) cancel();
    this.pendingCommands.clear();
    this.clearRampTimers();
    this.command?.disconnect();
    this.event?.disconnect();
    this.command = null;
    this.event = null;
    this.projectName = null;
    this.commandConsumer = null;
    this.commandBuf = '';
    this.eventBuf = '';
    this.setStatus('disconnected');
  }

  getStatus(): ConnectionStatus { return this.status; }
}
