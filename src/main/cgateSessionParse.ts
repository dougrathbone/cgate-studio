import type { CgateNetworkInfo } from '../shared/types';

/** Parse `network=` lines from a NET LIST response. */
export function parseNetworkLines(lines: string[]): CgateNetworkInfo[] {
  const out: CgateNetworkInfo[] = [];
  for (const line of lines) {
    const addrM = line.match(/network=(\S+)/i);
    if (!addrM) continue;
    const stateM = line.match(/(?:^|\s)State=(\S+)/i);
    const ifaceM = line.match(/InterfaceState=(\S+)/i);
    const syncM = line.match(/SyncState=(\S+)/i);
    out.push({
      address: addrM[1],
      state: stateM?.[1] ?? null,
      interfaceState: ifaceM?.[1] ?? null,
      syncState: syncM?.[1] ?? null,
    });
  }
  return out;
}

/** Pull State / InterfaceState / SyncState from GET response lines for one network. */
export function parseNetworkHealthFromGet(
  address: string,
  lines: string[],
): CgateNetworkInfo {
  const blob = lines.join('\n');
  const stateM = blob.match(/(?:^|\s)State=(\S+)/i);
  const ifaceM = blob.match(/InterfaceState=(\S+)/i);
  const syncM = blob.match(/SyncState=(\S+)/i);
  return {
    address,
    state: stateM?.[1] ?? null,
    interfaceState: ifaceM?.[1] ?? null,
    syncState: syncM?.[1] ?? null,
  };
}
