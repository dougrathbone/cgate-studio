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

  it('maps on/off events to states and skips invalid/blank lines', () => {
    svc = new CgateService();
    const states: any[] = [];
    svc.on('state', (s) => states.push(s));
    // Drive the event handler directly with a multi-line buffer: an on event
    // with no explicit level (-> 255), an unparseable line (skipped), a blank
    // line (skipped), and an off event (-> level 0).
    (svc as any).handleEventData(
      Buffer.from('lighting on 254/56/4\nnot-a-valid-event\n\nlighting off 254/56/5\n'),
    );
    expect(states).toEqual([
      { address: '254/56/4', level: 255, on: true },
      { address: '254/56/5', level: 0, on: false },
    ]);
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

  it('connect() tears down the prior connection so reconnect does not double-emit state', async () => {
    const states: any[] = [];
    const collect = (s: any) => states.push(s);
    let pushTimer: ReturnType<typeof setInterval> | undefined;
    let safety: ReturnType<typeof setTimeout> | undefined;

    // Re-push (one level) until the (single) event connection is registered
    // server-side and the first matching state lands, then stop pushing. Mirrors
    // the mock's async client-registration timing handled by the live-state test.
    const warmUp = async (level: number) => {
      await new Promise<void>((resolve, reject) => {
        pushTimer = setInterval(() => mock.pushEvent(`lighting ramp 254/56/4 ${level}`), 25);
        safety = setTimeout(() => reject(new Error('no state received during warmup')), 4000);
        const onFirst = (s: any) => { if (s.level === level) { svc.off('state', onFirst); resolve(); } };
        svc.on('state', onFirst);
      });
      if (pushTimer) { clearInterval(pushTimer); pushTimer = undefined; }
      if (safety) { clearTimeout(safety); safety = undefined; }
      // Let any already-dispatched pushes drain and be read, so a subsequent
      // teardown closes cleanly rather than resetting the mock mid-read.
      await new Promise((r) => setTimeout(r, 75));
    };

    try {
      svc = new CgateService();
      svc.on('state', collect);
      await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port });
      // Settle the first connection (drain its EVENT ON `200 OK.` ack and let the
      // event socket register) before reconnecting. This keeps the teardown a
      // clean close so the mock — whose sockets have no 'error' listener — isn't
      // hit by an abortive-reset read during the reconnect.
      await warmUp(128);

      // Reconnect. Without teardown, the FIRST event connection is orphaned but
      // keeps its 'data' listener bound to this service, so the mock's broadcast
      // pushEvent reaches both old and new event sockets -> handleEventData fires
      // twice -> two 'state' events for one logical event. With the fix there is
      // exactly one event connection, so one logical event -> one 'state'.
      await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port });
      await warmUp(200);

      // Fire exactly ONE distinctly-levelled event and count only that level, so
      // earlier warm-up states cannot affect the assertion. pushEvent writes to
      // all sockets synchronously, so a duplicate (bug) would arrive within the
      // grace window alongside the first.
      const before = states.filter((s) => s.level === 99).length;
      mock.pushEvent('lighting ramp 254/56/4 99');
      await new Promise((r) => setTimeout(r, 150));
      const after = states.filter((s) => s.level === 99).length;
      expect(after - before).toBe(1);
    } finally {
      if (pushTimer) clearInterval(pushTimer);
      if (safety) clearTimeout(safety);
      svc.off('state', collect);
    }
  });
});
