import { EventEmitter } from 'events';
import type { ConnectOptions, Tree, GroupState, ConnectionStatus } from '../shared/types';

const CgateConnection = require('../cgate-client/cgateConnection');
const CBusEvent = require('../cgate-client/cbusEvent');
const { parseTreeXml } = require('../cgate-client/treexml');

const TREE_START = /^343/m;
const TREE_END = /^344[ \t]/m;
const TREE_TIMEOUT_MS = 10000;

export class CgateService extends EventEmitter {
  private command: any = null;
  private event: any = null;
  private status: ConnectionStatus = 'disconnected';
  // Cancel callbacks for in-flight getTree() calls so disconnect() can settle
  // them promptly instead of leaving hung promises / leaked timers (I3).
  private pendingTrees = new Set<() => void>();

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
    this.command = new CgateConnection('command', opts.host, opts.commandPort, {
      cgateusername: opts.username,
      cgatepassword: opts.password,
    });
    this.event = new CgateConnection('event', opts.host, opts.eventPort, {});

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
    this.setStatus('connected');
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

  // Accumulate TREEXML data lines until the 344 terminator, then parse.
  //
  // ROBUSTNESS: on connect the command connection auto-sends `EVENT ON`, which
  // the server acks with `200 OK.` on this same command stream. That ack can
  // land in `raw` right as getTree attaches its listener, and treexml's
  // stripResponseCodes would otherwise fold its body into the XML payload and
  // corrupt the parse. We defend by only keeping the frame from the first
  // TREE_START (`343`) line onward, discarding any earlier status lines, while
  // still waiting for the `344` terminator before parsing.
  //
  // TODO(M1-followup): M5 — serialize concurrent getTree() calls; they share the
  // single command 'data' stream and would currently interleave their frames.
  getTree(network: string): Promise<Tree> {
    const conn = this.command;
    return new Promise<Tree>((resolve, reject) => {
      if (!conn) {
        reject(new Error('Not connected'));
        return;
      }
      let raw = '';
      let settled = false;
      let timer: ReturnType<typeof setTimeout>;

      const onData = (buf: Buffer) => {
        // TODO(M1-followup): M6 — decode with StringDecoder so multibyte chars
        // split across socket chunks aren't corrupted by per-chunk toString().
        raw += buf.toString();
        if (!TREE_END.test(raw)) return;
        const startMatch = raw.match(TREE_START);
        const frame = startMatch ? raw.slice(startMatch.index) : raw;
        parseTreeXml(frame, network).then(
          (tree: Tree) => settle(() => resolve(tree)),
          (err: Error) => settle(() => reject(err)),
        );
      };

      const settle = (apply: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        conn.off('data', onData);
        this.pendingTrees.delete(cancel);
        apply();
      };

      // Invoked by disconnect() to reject this getTree without leaking the
      // timer/listener (I3).
      const cancel = () => settle(() => reject(new Error('Disconnected during getTree')));

      timer = setTimeout(() => settle(() => reject(new Error('TREEXML timed out'))), TREE_TIMEOUT_MS);
      this.pendingTrees.add(cancel);
      conn.on('data', onData);
      conn.send(`TREEXML ${network}\r\n`);
    });
  }

  private handleEventData(buf: Buffer) {
    for (const line of buf.toString().split(/\r?\n/)) {
      if (!line.trim()) continue;
      const evt = new CBusEvent(line);
      if (!evt.isValid()) continue;
      const level = evt.getLevel() ?? (evt.getAction() === 'on' ? 255 : 0);
      const state: GroupState = {
        address: `${evt.getNetwork()}/${evt.getApplication()}/${evt.getGroup()}`,
        level,
        on: level > 0,
      };
      this.emit('state', state);
    }
  }

  async disconnect(): Promise<void> {
    // Settle any in-flight getTree() first so callers don't hang and no
    // timer/listener leaks once the connection is gone (I3).
    for (const cancel of [...this.pendingTrees]) cancel();
    this.pendingTrees.clear();
    this.command?.disconnect();
    this.event?.disconnect();
    this.command = null;
    this.event = null;
    this.setStatus('disconnected');
  }

  getStatus(): ConnectionStatus { return this.status; }
}
