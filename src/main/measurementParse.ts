import type { MeasurementState } from '../shared/types';

// The leading token C-Gate uses for a measurement-application event. Isolated so
// a post-validation change is one edit. VALIDATE@live-cgate.
const MEASUREMENT_PREFIX = 'measurement';

// Parse a C-Bus Measurement-application (228) event line into a MeasurementState.
// Tolerant and total: returns null for anything it does not recognize, so a
// malformed line can never throw on the event hot path.
//
// Working-assumption format (VALIDATE@live-cgate):
//   measurement [//PROJECT/]<net>/<app>/<channel> <value> [units=<u>]
export function parseMeasurementEvent(line: string): MeasurementState | null {
  const trimmed = (line ?? '').trim();
  if (!trimmed.toLowerCase().startsWith(MEASUREMENT_PREFIX + ' ')) return null;

  const rest = trimmed.slice(MEASUREMENT_PREFIX.length).trim();
  const tokens = rest.split(/\s+/);
  if (tokens.length < 2) return null;

  // Address: strip an optional //PROJECT/ prefix, require net/app/channel.
  let addr = tokens[0];
  if (addr.startsWith('//')) {
    const firstSeg = addr.indexOf('/', 2);
    addr = firstSeg === -1 ? '' : addr.slice(firstSeg + 1);
  }
  const parts = addr.split('/');
  if (parts.length !== 3 || parts.some((p) => p === '' || !/^\d+$/.test(p))) return null;

  const value = Number(tokens[1]);
  if (!Number.isFinite(value)) return null;

  const unitsToken = tokens.slice(2).find((t) => /^units=/i.test(t));
  const units = unitsToken ? unitsToken.slice(unitsToken.indexOf('=') + 1) || null : null;

  return {
    address: `${parts[0]}/${parts[1]}/${parts[2]}`,
    network: parts[0],
    application: parts[1],
    channel: parts[2],
    value,
    units,
  };
}
