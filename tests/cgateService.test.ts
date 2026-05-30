import { CgateService } from '../src/main/CgateService';
import { startMockCgate, MockCgateHandle } from './helpers/mockCgate';

describe('CgateService', () => {
  let mock: MockCgateHandle;
  let svc: CgateService;

  beforeEach(async () => { mock = await startMockCgate(); });
  afterEach(async () => { await svc?.disconnect(); await mock.close(); });

  it('connects and reports connected status', async () => {
    svc = new CgateService();
    const statuses: string[] = [];
    svc.on('status', (s) => statuses.push(s));
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port });
    expect(statuses).toContain('connected');
  });

  it('fetches and parses the network tree', async () => {
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port });
    const tree = await svc.getTree('254');
    expect(tree[0].address).toBe('254');
    expect(tree[0].applications[0].groups[0].label).toBe('Kitchen');
  });

  it('emits state when an event arrives on the event stream', async () => {
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port });
    // The in-process mock registers the event-port client asynchronously (its
    // server-side `connection` callback adds the socket to `clients` after
    // connect() resolves, since the event connection — unlike the command one —
    // does no round-trip to force acceptance). pushEvent is one-shot, so a
    // single immediate push can be lost. Re-push until the event lands; real
    // C-Gate streams events continuously, so this is purely a mock-timing race.
    let pushTimer: ReturnType<typeof setInterval> | undefined;
    let safetyTimer: ReturnType<typeof setTimeout> | undefined;
    let onState: ((s: any) => void) | undefined;
    try {
      const state = await new Promise<any>((resolve, reject) => {
        onState = (s: any) => resolve(s);
        svc.on('state', onState);
        pushTimer = setInterval(() => mock.pushEvent('lighting ramp 254/56/4 128'), 25);
        // Safety net so a failing run rejects deterministically instead of
        // leaking the interval/listener until Jest's global timeout (M8).
        safetyTimer = setTimeout(() => reject(new Error('timed out waiting for state event')), 4000);
      });
      expect(state).toMatchObject({ address: '254/56/4', level: 128, on: true });
    } finally {
      if (pushTimer) clearInterval(pushTimer);
      if (safetyTimer) clearTimeout(safetyTimer);
      if (onState) svc.off('state', onState);
    }
  });

  it('connect rejects (and does not crash) when the C-Gate is unreachable', async () => {
    svc = new CgateService();
    // Port 1 refuses immediately on localhost, so this rejects fast and
    // deterministically (no reliance on the client's connection timeout). The
    // fact that the process survives exercises C1/C2 (guarded error re-emit,
    // persistent error listeners) and I4 (teardown of both connections).
    await expect(
      svc.connect({ host: '127.0.0.1', commandPort: 1, eventPort: 1 }),
    ).rejects.toThrow();
    expect(svc.getStatus()).toBe('error');
  });

  it('disconnect() while a getTree is in flight rejects the getTree promise instead of hanging', async () => {
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port });
    const p = svc.getTree('254');
    // Attach the rejection assertion BEFORE disconnect so there is no window for
    // an unhandled rejection.
    const assertion = expect(p).rejects.toThrow('Disconnected during getTree');
    // disconnect() runs synchronously up to settling pending getTree calls, so
    // p rejects before the mock's TREEXML response is processed (I3).
    await svc.disconnect();
    await assertion;
  });
});
