import { StringDecoder } from 'string_decoder';
import { CBusEvent, constants } from 'cgateweb/cgate-client';
import type { GroupState, MeasurementState, TreeChange, TriggerActivity } from '../shared/types';
import { parseMeasurementEvent } from './measurementParse';

const { CGATE_RESPONSE_SYSTEM_EVENT } = constants;

const RAMP_SETTLE_MS = 12000;

export type EventBridgeEmit = {
  treeChanged: (c: TreeChange) => void;
  measurement: (m: MeasurementState) => void;
  trigger: (t: TriggerActivity) => void;
  state: (s: GroupState) => void;
};

/**
 * Assembles the C-Gate event socket stream into state / trigger / measurement /
 * treeChanged emissions. Owns ramp settle timers for Stop-control UX.
 */
export class CgateEventBridge {
  private eventBuf = '';
  private eventDecoder = new StringDecoder('utf8');
  private rampTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly emit: EventBridgeEmit) {}

  reset(): void {
    this.eventBuf = '';
    this.eventDecoder = new StringDecoder('utf8');
    this.clearRampTimers();
  }

  clearRampTimers(): void {
    for (const t of this.rampTimers.values()) clearTimeout(t);
    this.rampTimers.clear();
  }

  onData(buf: Buffer): void {
    this.eventBuf += this.eventDecoder.write(buf);
    let idx;
    while ((idx = this.eventBuf.indexOf('\n')) !== -1) {
      const line = this.eventBuf.slice(0, idx).replace(/\r$/, '');
      this.eventBuf = this.eventBuf.slice(idx + 1);
      if (!line.trim()) continue;
      if (line.startsWith(CGATE_RESPONSE_SYSTEM_EVENT)) {
        const m = line.match(/\/\/[^/]+\/(\d+)\b/);
        this.emit.treeChanged({ network: m ? m[1] : null, raw: line });
        continue;
      }
      const measurement = parseMeasurementEvent(line);
      if (measurement) {
        this.emit.measurement(measurement);
        continue;
      }
      try {
        const evt = new CBusEvent(line);
        if (!evt.isValid()) continue;
        const network = evt.getNetwork()!;
        const application = evt.getApplication()!;
        const group = evt.getGroup()!;
        const address = `${network}/${application}/${group}`;
        if (evt.getDeviceType() === 'trigger') {
          const actionSelector = evt.getLevel() ?? (evt.getAction() === 'on' ? 255 : 0);
          this.emit.trigger({ address, network, application, group, actionSelector });
          continue;
        }
        const level = evt.getLevel() ?? (evt.getAction() === 'on' ? 255 : 0);
        const ramping = evt.getAction() === 'ramp';
        this.emit.state({ address, level, on: level > 0, ramping });
        this.trackRamp(address, level, ramping);
      } catch {
        /* ignore malformed event lines */
      }
    }
  }

  private trackRamp(address: string, level: number, ramping: boolean): void {
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
        this.emit.state({ address, level, on: level > 0, ramping: false });
      }, RAMP_SETTLE_MS),
    );
  }
}
