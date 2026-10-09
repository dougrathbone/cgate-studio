import { EventEmitter } from 'events';
import type {
  ConnectOptions,
  Tree,
  ConnectionStatus,
  GroupRef,
  CommandResult,
  GroupDetail,
  CgateNetworkInfo,
  ActivityEntry,
} from '../shared/types';
import { CONNECTION_SUPERSEDED, networkNeedsForce } from '../shared/types';
import type { CgateObjectParams } from '../shared/types';
import type { CgateServerStatus } from '../shared/cgateStatus';
import type { CgateProjectInfo } from '../shared/cgateStatus';
import {
  parseProjectLines,
  parseServerVersion,
  resolveActiveProject,
} from './cgateStatusParse';
import { parseNetworkLines, parseNetworkHealthFromGet } from './cgateSessionParse';
import { formatCgateSetValue, parseObjectParams } from './cgateParamParse';
import { CgateConnection } from 'cgateweb/cgate-client';
import { parseTreeXml } from '../cgate-client/treexml';
import { CgateCommandChannel } from './cgateCommandChannel';
import { CgateEventBridge } from './cgateEventBridge';

const TREE_START = /^343/m;
const TREE_END = /^344[ \t]/m;
const TREE_TIMEOUT_MS = 10000;

export class CgateService extends EventEmitter {
  private command: CgateConnection | null = null;
  private event: CgateConnection | null = null;
  private status: ConnectionStatus = 'disconnected';
  private projectName: string | null = null;
  private serverGreeting: string | null = null;
  private connectOpts: Pick<ConnectOptions, 'host' | 'commandPort' | 'eventPort'> | null = null;
  private connectGeneration = 0;
  private networkHealth = new Map<string, CgateNetworkInfo>();
  private lastError: string | null = null;
  private static readonly SYNC_TIMEOUT_MS = 120_000;

  private readonly channel = new CgateCommandChannel({
    onActivity: (entry) => this.emit('activity', entry),
    onGreeting: (line) => {
      this.serverGreeting = line;
    },
  });

  private readonly events = new CgateEventBridge({
    treeChanged: (c) => this.emit('treeChanged', c),
    measurement: (m) => this.emit('measurement', m),
    trigger: (t) => this.emit('trigger', t),
    state: (s) => this.emit('state', s),
  });

  private setStatus(s: ConnectionStatus) {
    this.status = s;
    this.emit('status', s);
  }

  private safeEmitError(e: Error) {
    this.lastError = e.message ? String(e.message).slice(0, 500) : 'Unknown error';
    this.setStatus('error');
    if (this.listenerCount('error') > 0) this.emit('error', e);
  }

  private teardownConnections(): void {
    this.channel.teardown();
    this.events.reset();
    this.event?.disconnect();
    this.command = null;
    this.event = null;
    this.serverGreeting = null;
    this.networkHealth.clear();
  }

  private assertConnectGeneration(gen: number): void {
    if (this.connectGeneration !== gen) {
      throw new Error(CONNECTION_SUPERSEDED);
    }
  }

  async connect(opts: ConnectOptions): Promise<void> {
    const gen = ++this.connectGeneration;
    this.teardownConnections();
    this.assertConnectGeneration(gen);
    this.setStatus('connecting');
    this.lastError = null;
    this.projectName = opts.project ?? null;
    this.connectOpts = { host: opts.host, commandPort: opts.commandPort, eventPort: opts.eventPort };
    this.serverGreeting = null;
    this.command = new CgateConnection('command', opts.host, opts.commandPort, {
      cgateusername: opts.username,
      cgatepassword: opts.password,
    });
    this.event = new CgateConnection('event', opts.host, opts.eventPort, {});
    this.channel.setConnection(this.command);
    this.channel.resetBuffers();
    this.events.reset();

    this.command.on('data', (buf: Buffer) => this.channel.onData(buf));
    this.event.on('data', (buf: Buffer) => this.events.onData(buf));
    this.command.on('error', (e: Error) => this.safeEmitError(e));
    this.event.on('error', (e: Error) => this.safeEmitError(e));
    this.event.on('close', () => this.setStatus('reconnecting'));

    try {
      await Promise.all([
        this.waitForConnect(this.command),
        this.waitForConnect(this.event),
      ]);
      this.assertConnectGeneration(gen);
    } catch (e) {
      if (e instanceof Error && e.message === CONNECTION_SUPERSEDED) throw e;
      this.command?.disconnect();
      this.event?.disconnect();
      this.command = null;
      this.event = null;
      this.channel.setConnection(null);
      this.setStatus('error');
      this.lastError = e instanceof Error ? e.message : String(e);
      throw e;
    }
    await this.channel.drainHandshake();
    this.assertConnectGeneration(gen);
    this.setStatus('connected');
  }

  private waitForConnect(conn: CgateConnection): Promise<void> {
    return new Promise((resolve, reject) => {
      const onConnect = () => {
        cleanup();
        resolve();
      };
      const onError = (e: Error) => {
        cleanup();
        reject(e);
      };
      const cleanup = () => {
        conn.off('connect', onConnect);
        conn.off('error', onError);
      };
      conn.on('connect', onConnect);
      conn.on('error', onError);
      conn.connect();
    });
  }

  async getTree(network: string): Promise<Tree> {
    const project = await this.getProjectName();
    if (project) {
      try {
        return await this.fetchTreexml(`//${project}/${network}`, network);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (
          /disconnected/i.test(msg) ||
          msg === 'Not connected' ||
          msg === CONNECTION_SUPERSEDED
        ) {
          throw e;
        }
      }
    }
    return this.fetchTreexml(network, network);
  }

  private fetchTreexml(target: string, networkForParse: string): Promise<Tree> {
    return this.channel.runExclusive(
      () =>
        new Promise<Tree>((resolve, reject) => {
          const conn = this.channel.getConnection();
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
            this.channel.detachConsumer(consume, cancel);
            apply();
          };

          const consume = (line: string) => {
            lines.push(line);
            if (/^4\d{2} /.test(line)) {
              settle(() => reject(new Error(`C-Gate ${line}`)));
              return;
            }
            if (!TREE_END.test(line)) return;
            const startIdx = lines.findIndex((l) => TREE_START.test(l));
            const frame = (startIdx === -1 ? lines : lines.slice(startIdx)).join('\n');
            parseTreeXml(frame, networkForParse).then(
              (tree) => settle(() => resolve(tree as Tree)),
              (err: Error) => settle(() => reject(err)),
            );
          };

          const cancel = () => settle(() => reject(new Error('Disconnected during getTree')));

          timer = setTimeout(
            () => settle(() => reject(new Error('TREEXML timed out'))),
            TREE_TIMEOUT_MS,
          );
          this.channel.attachConsumer(consume, cancel);
          conn.send(`TREEXML ${target}\r\n`);
        }),
    );
  }

  sendCommand(cmd: string, opts?: { timeoutMs?: number }): Promise<CommandResult> {
    return this.channel.sendCommand(cmd, opts);
  }

  getActivityLog(): ActivityEntry[] {
    return this.channel.getActivityLog();
  }

  private rememberNetwork(info: CgateNetworkInfo) {
    this.networkHealth.set(info.address, info);
  }

  private noteListFailure(op: string, e: unknown): void {
    const msg = e instanceof Error ? e.message : String(e);
    this.lastError = `${op}: ${msg}`.slice(0, 500);
  }

  async getProjectName(): Promise<string> {
    if (this.projectName != null) return this.projectName;
    try {
      const res = await this.sendCommand('PROJECT LIST');
      const m = res.lines.join('\n').match(/project=(?:"([^"]+)"|(\S+))/i);
      this.projectName = m ? (m[1] ?? m[2]) : '';
    } catch (e) {
      this.noteListFailure('PROJECT LIST', e);
      this.projectName = '';
    }
    return this.projectName;
  }

  async listProjectsOnDisk(): Promise<CgateProjectInfo[]> {
    try {
      return parseProjectLines((await this.sendCommand('PROJECT DIR')).lines);
    } catch (e) {
      this.noteListFailure('PROJECT DIR', e);
      return [];
    }
  }

  async listLoadedProjects(): Promise<CgateProjectInfo[]> {
    try {
      return parseProjectLines((await this.sendCommand('PROJECT LIST')).lines);
    } catch (e) {
      this.noteListFailure('PROJECT LIST', e);
      return [];
    }
  }

  async loadProject(name: string): Promise<CommandResult> {
    return this.sendCommand(`PROJECT LOAD ${name}`);
  }

  async startProject(name: string): Promise<CommandResult> {
    return this.sendCommand(`PROJECT START ${name}`);
  }

  async useProject(name: string): Promise<CommandResult> {
    const res = await this.sendCommand(`PROJECT USE ${name}`);
    this.projectName = name;
    return res;
  }

  async listNetworks(): Promise<CgateNetworkInfo[]> {
    try {
      const nets = parseNetworkLines((await this.sendCommand('NET LIST')).lines);
      for (const n of nets) this.rememberNetwork(n);
      return nets;
    } catch (e) {
      this.noteListFailure('NET LIST', e);
      return [];
    }
  }

  async openNetwork(network: string): Promise<CommandResult> {
    const res = await this.sendCommand(`NET OPEN ${network}`, {
      timeoutMs: CgateService.SYNC_TIMEOUT_MS,
    });
    this.channel.noteActivity('info', `Network ${network} open`);
    await this.refreshNetworkHealth(network).catch(() => {});
    return res;
  }

  async closeNetwork(network: string): Promise<CommandResult> {
    const res = await this.sendCommand(`NET CLOSE ${network}`);
    this.channel.noteActivity('info', `Network ${network} closed`);
    await this.refreshNetworkHealth(network).catch(() => {});
    return res;
  }

  async syncNetwork(network: string): Promise<CommandResult> {
    this.channel.noteActivity('info', `Syncing network ${network}…`);
    const res = await this.sendCommand(`DO ${network} SYNC`, {
      timeoutMs: CgateService.SYNC_TIMEOUT_MS,
    });
    this.channel.noteActivity('info', `Sync complete for ${network}`);
    await this.refreshNetworkHealth(network).catch(() => {});
    return res;
  }

  async refreshNetworkHealth(network: string): Promise<CgateNetworkInfo> {
    const project = await this.getProjectName();
    const path = project ? `//${project}/${network}` : `//${network}`;
    const merged: CgateNetworkInfo = {
      address: network,
      state: null,
      interfaceState: null,
      syncState: null,
      ...(this.networkHealth.get(network) ?? {}),
    };
    for (const param of ['State', 'InterfaceState', 'SyncState'] as const) {
      try {
        const res = await this.sendCommand(`GET ${path} ${param}`);
        const parsed = parseNetworkHealthFromGet(network, res.lines);
        if (param === 'State' && parsed.state) merged.state = parsed.state;
        if (param === 'InterfaceState' && parsed.interfaceState) {
          merged.interfaceState = parsed.interfaceState;
        }
        if (param === 'SyncState' && parsed.syncState) merged.syncState = parsed.syncState;
      } catch {
        // Parameter may be unsupported — keep prior value.
      }
    }
    this.rememberNetwork(merged);
    return merged;
  }

  getCachedNetworkHealth(network: string): CgateNetworkInfo | null {
    return this.networkHealth.get(network) ?? null;
  }

  private async groupPath(ref: GroupRef): Promise<string> {
    const project = await this.getProjectName();
    const prefix = project ? `//${project}/` : '//';
    return `${prefix}${ref.network}/${ref.application}/${ref.group}`;
  }

  private forceSuffix(network: string): string {
    return networkNeedsForce(this.networkHealth.get(network)) ? ' FORCE' : '';
  }

  async setLevel(ref: GroupRef, level: number, rampSecs?: number): Promise<CommandResult> {
    const path = await this.groupPath(ref);
    const lv = Math.max(0, Math.min(255, Math.round(level)));
    const force = this.forceSuffix(ref.network);
    let cmd: string;
    if (lv <= 0) cmd = `OFF ${path}${force}`;
    else if (lv >= 255 && rampSecs == null) cmd = `ON ${path}${force}`;
    else cmd = `RAMP ${path} ${lv}${rampSecs != null ? ` ${rampSecs}s` : ''}${force}`;
    return this.sendCommand(cmd);
  }

  async terminateRamp(ref: GroupRef): Promise<CommandResult> {
    return this.sendCommand(
      `TERMINATERAMP ${await this.groupPath(ref)}${this.forceSuffix(ref.network)}`,
    );
  }

  async fireScene(ref: GroupRef, actionSelector: number): Promise<CommandResult> {
    const sel = Math.max(0, Math.min(255, Math.round(actionSelector)));
    return this.sendCommand(`TRIGGER EVENT ${await this.groupPath(ref)} ${sel}`);
  }

  async getGroupDetail(ref: GroupRef): Promise<GroupDetail> {
    const path = await this.groupPath(ref);
    let label: string | null = null;
    let level: number | null = null;

    try {
      let res: CommandResult;
      try {
        res = await this.sendCommand(`DBGET ${path}/TagName`);
      } catch {
        res = await this.sendCommand(`DBGET ${path} TagName`);
      }
      const blob = res.lines.join('\n');
      const m =
        blob.match(/TagName="([^"]*)"/i) || blob.match(/TagName=([^\r\n]+)/i);
      const tag = m?.[1]?.trim();
      label = tag && tag !== '<Unused>' ? tag : null;
    } catch {
      // No tag DB
    }

    try {
      const res = await this.sendCommand(`GET ${path} level`);
      const m = res.lines.join('\n').match(/level=(\d+)/i);
      if (m) level = Number(m[1]);
    } catch {
      // level not queryable
    }

    return { label, level };
  }

  async getNetworkLevels(
    network: string,
    applications: string[] = ['56'],
  ): Promise<Record<string, number>> {
    const project = await this.getProjectName();
    const prefix = project ? `//${project}/` : '//';
    const out: Record<string, number> = {};
    const apps = applications.length > 0 ? applications : ['56'];
    for (const app of apps) {
      try {
        const res = await this.sendCommand(`GET ${prefix}${network}/${app}/* level`);
        for (const line of res.lines) {
          const m = line.match(/\/(\d+)\/(\d+)\/(\d+):\s*level=(\d+)/i);
          if (m) out[`${m[1]}/${m[2]}/${m[3]}`] = Number(m[4]);
        }
      } catch {
        // skip app
      }
    }
    return out;
  }

  async identifyUnit(network: string, unitAddress: string): Promise<CommandResult> {
    const project = await this.getProjectName();
    const prefix = project ? `//${project}/` : '//';
    return this.sendCommand(`ID ${prefix}${network}/p/${unitAddress}`);
  }

  async setName(ref: GroupRef, name: string): Promise<CommandResult> {
    if (!name.trim()) return this.clearTagName(ref);
    return this.setTagName(ref, name);
  }

  async setTagName(ref: GroupRef, name: string): Promise<CommandResult> {
    const path = await this.groupPath(ref);
    return this.sendCommand(`DBSET ${path}/TagName ${formatCgateSetValue(name)}`);
  }

  async clearTagName(ref: GroupRef): Promise<CommandResult> {
    const path = await this.groupPath(ref);
    return this.sendCommand(`DBSET ${path}/TagName "<Unused>"`);
  }

  async getGroupParams(ref: GroupRef): Promise<CgateObjectParams> {
    return this.getObjectParams(await this.groupPath(ref));
  }

  async getUnitParams(network: string, unitAddress: string): Promise<CgateObjectParams> {
    const project = await this.getProjectName();
    const prefix = project ? `//${project}/` : '//';
    return this.getObjectParams(`${prefix}${network}/p/${unitAddress}`);
  }

  async setGroupParam(ref: GroupRef, param: string, value: string): Promise<CommandResult> {
    const path = await this.groupPath(ref);
    return this.sendCommand(`SET ${path} ${param} ${formatCgateSetValue(value)}`);
  }

  async setUnitName(network: string, unitAddress: string, name: string): Promise<CommandResult> {
    const project = await this.getProjectName();
    const prefix = project ? `//${project}/` : '//';
    const path = `${prefix}${network}/p/${unitAddress}`;
    return this.sendCommand(`SET ${path} Name ${formatCgateSetValue(name)}`);
  }

  private async getObjectParams(path: string): Promise<CgateObjectParams> {
    const res = await this.sendCommand(`GET ${path} *`);
    return parseObjectParams(res.lines);
  }

  async saveProject(): Promise<CommandResult> {
    const project = await this.getProjectName();
    return this.sendCommand(`PROJECT SAVE${project ? ` ${project}` : ''}`);
  }

  async getServerStatus(): Promise<CgateServerStatus> {
    const base: CgateServerStatus = {
      connection: this.status,
      host: this.connectOpts?.host ?? null,
      commandPort: this.connectOpts?.commandPort ?? null,
      eventPort: this.connectOpts?.eventPort ?? null,
      commandConnected: !!this.command?.connected,
      eventConnected: !!this.event?.connected,
      serverVersion: parseServerVersion(this.serverGreeting),
      serverGreeting: this.serverGreeting,
      activeProject: null,
      loadedProjects: [],
      projectsOnDisk: [],
      lastError: this.lastError,
    };

    if (this.status !== 'connected' || !this.command) return base;

    let loadedProjects = base.loadedProjects;
    let projectsOnDisk = base.projectsOnDisk;
    try {
      loadedProjects = parseProjectLines((await this.sendCommand('PROJECT LIST')).lines);
    } catch (e) {
      this.noteListFailure('PROJECT LIST (status)', e);
    }
    try {
      projectsOnDisk = parseProjectLines((await this.sendCommand('PROJECT DIR')).lines);
    } catch (e) {
      this.noteListFailure('PROJECT DIR (status)', e);
    }

    const projectName = await this.getProjectName();
    return {
      ...base,
      loadedProjects,
      projectsOnDisk,
      activeProject: resolveActiveProject(loadedProjects, projectName || null),
      lastError: this.lastError,
    };
  }

  async disconnect(): Promise<void> {
    this.connectGeneration++;
    this.teardownConnections();
    this.projectName = null;
    this.connectOpts = null;
    this.lastError = null;
    this.setStatus('disconnected');
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  /** Test / diagnostic hook — feed a raw event-stream chunk. */
  handleEventData(buf: Buffer): void {
    this.events.onData(buf);
  }
}
