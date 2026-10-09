import type { ConnectOptions, GroupRef, LabelImport, Site, SiteInput } from '../shared/types';

/** Toolkit / C-Gate project and network token (no whitespace or shell metacharacters). */
const TOKEN = /^[A-Za-z0-9_-]+$/;
/** C-Bus address segment (network / application / group / unit). */
const ADDR = /^\d{1,5}$/;
/** Object parameter name for SET (letters, digits, underscore). */
const PARAM = /^\w+$/;

export const MAX_LABEL_MAP_ENTRIES = 50_000;

export class IpcValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IpcValidationError';
  }
}

export function assertToken(name: string, label = 'name'): string {
  const s = String(name ?? '').trim();
  if (!s || !TOKEN.test(s)) {
    throw new IpcValidationError(`Invalid ${label}`);
  }
  return s;
}

export function assertOptionalToken(name: unknown, label = 'name'): string | undefined {
  if (name == null || name === '') return undefined;
  return assertToken(String(name), label);
}

export function assertAddressSegment(value: string, label: string): string {
  const s = String(value ?? '').trim();
  if (!ADDR.test(s)) throw new IpcValidationError(`Invalid ${label}`);
  return s;
}

export function assertGroupRef(ref: GroupRef): GroupRef {
  if (!ref || typeof ref !== 'object') throw new IpcValidationError('Invalid group ref');
  return {
    network: assertAddressSegment(ref.network, 'network'),
    application: assertAddressSegment(ref.application, 'application'),
    group: assertAddressSegment(ref.group, 'group'),
  };
}

export function assertParamName(param: string): string {
  const s = String(param ?? '').trim();
  if (!PARAM.test(s) || s.length > 64) {
    throw new IpcValidationError('Invalid parameter name');
  }
  return s;
}

export function assertLevel(level: number): number {
  const n = Number(level);
  if (!Number.isFinite(n)) throw new IpcValidationError('Invalid level');
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function assertOptionalRampSecs(rampSecs: unknown): number | undefined {
  if (rampSecs == null) return undefined;
  const n = Number(rampSecs);
  if (!Number.isFinite(n) || n < 0 || n > 3600) {
    throw new IpcValidationError('Invalid ramp duration');
  }
  return n;
}

export function assertActionSelector(sel: number): number {
  return assertLevel(sel);
}

export function assertConnectOptions(opts: ConnectOptions): ConnectOptions {
  if (!opts || typeof opts !== 'object') throw new IpcValidationError('Invalid connect options');
  const rawHost = String(opts.host ?? '');
  const host = rawHost.trim();
  // Reject embedded whitespace/newlines (trim alone would hide trailing \n).
  if (!host || host.length > 253 || /\s/.test(rawHost)) {
    throw new IpcValidationError('Invalid host');
  }
  const commandPort = Number(opts.commandPort);
  const eventPort = Number(opts.eventPort);
  if (!Number.isInteger(commandPort) || commandPort < 1 || commandPort > 65535) {
    throw new IpcValidationError('Invalid command port');
  }
  if (!Number.isInteger(eventPort) || eventPort < 1 || eventPort > 65535) {
    throw new IpcValidationError('Invalid event port');
  }
  return {
    host,
    commandPort,
    eventPort,
    project: assertOptionalToken(opts.project, 'project'),
    username: opts.username != null && String(opts.username).trim()
      ? String(opts.username).trim().slice(0, 128)
      : undefined,
    password: opts.password != null && String(opts.password)
      ? String(opts.password).slice(0, 256)
      : undefined,
  };
}

export function assertSiteInput(input: SiteInput): SiteInput {
  const base = assertConnectOptions({
    host: input.host,
    commandPort: input.commandPort,
    eventPort: input.eventPort,
    username: input.username,
    password: input.password,
    project: input.defaultProject,
  });
  const name = String(input.name ?? '').trim();
  if (!name || name.length > 128 || /[\r\n]/.test(name)) {
    throw new IpcValidationError('Invalid site name');
  }
  return {
    name,
    host: base.host,
    commandPort: base.commandPort,
    eventPort: base.eventPort,
    username: base.username,
    password: base.password,
    defaultProject: assertOptionalToken(input.defaultProject, 'default project'),
    defaultNetwork: assertOptionalToken(input.defaultNetwork, 'default network'),
  };
}

export function assertSite(site: Site): Site {
  const id = String(site?.id ?? '').trim();
  if (!id || id.length > 64) throw new IpcValidationError('Invalid site id');
  return { id, ...assertSiteInput(site) };
}

export function assertLabelImport(labels: LabelImport): LabelImport {
  if (!labels || typeof labels !== 'object') {
    throw new IpcValidationError('Invalid label import');
  }
  const networks = asStringMap(labels.networks, 'networks');
  const applications = asStringMap(labels.applications, 'applications');
  const groups = asStringMap(labels.groups, 'groups');
  const total =
    Object.keys(networks).length +
    Object.keys(applications).length +
    Object.keys(groups).length;
  if (total > MAX_LABEL_MAP_ENTRIES) {
    throw new IpcValidationError('Label import too large');
  }
  return {
    source: String(labels.source ?? '').slice(0, 512),
    networks,
    applications,
    groups,
    stats: {
      networkCount: finiteNum(labels.stats?.networkCount),
      groupCount: finiteNum(labels.stats?.groupCount),
      labelCount: finiteNum(labels.stats?.labelCount),
    },
  };
}

function asStringMap(v: unknown, label: string): Record<string, string> {
  if (!v || typeof v !== 'object') throw new IpcValidationError(`Invalid ${label}`);
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val !== 'string') continue;
    const key = String(k).slice(0, 64);
    const value = val.trim().slice(0, 256);
    if (key && value) out[key] = value;
  }
  return out;
}

function finiteNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
