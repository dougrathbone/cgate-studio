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
      { address: '254/56/4', level: 255, on: true, ramping: false },
      { address: '254/56/5', level: 0, on: false, ramping: false },
    ]);
  });

  it('fetches a group detail (label via DBGET TagName, level via GET level)', async () => {
    jest.useFakeTimers();
    try {
      svc = new CgateService();
      const states: any[] = [];
      svc.on('state', (s) => states.push(s));

      (svc as any).handleEventData(Buffer.from('lighting ramp 254/56/4 128\n'));
      expect(states[0]).toEqual({ address: '254/56/4', level: 128, on: true, ramping: true });

      // No settling event: the safety timer fires and clears the ramping flag.
      jest.advanceTimersByTime(12000);
      expect(states[1]).toEqual({ address: '254/56/4', level: 128, on: true, ramping: false });
    } finally {
      jest.useRealTimers();
    }
  });

  it('a settling on/off event cancels the ramping safety timer', () => {
    jest.useFakeTimers();
    try {
      svc = new CgateService();
      const states: any[] = [];
      svc.on('state', (s) => states.push(s));

      (svc as any).handleEventData(Buffer.from('lighting ramp 254/56/4 128\nlighting on 254/56/4\n'));
      expect(states).toEqual([
        { address: '254/56/4', level: 128, on: true, ramping: true },
        { address: '254/56/4', level: 255, on: true, ramping: false },
      ]);

      // The settle cancelled the timer, so nothing more is emitted.
      jest.advanceTimersByTime(20000);
      expect(states).toHaveLength(2);
    } finally {
      jest.useRealTimers();
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
    // connect()'s failure path already tore both sockets down (isDestroyed), so
    // no reconnect is scheduled. Settle here so any pending ECONNREFUSED
    // error/close callbacks log INSIDE this test rather than "after tests are
    // done" in a later, faster suite on a slow CI runner.
    await svc.disconnect();
    await new Promise((r) => setTimeout(r, 50));
  });

  it('disconnect() while a getTree is in flight rejects the getTree promise instead of hanging', async () => {
    svc = new CgateService();
    // Pin the project so getTree skips PROJECT LIST and enters fetchTreexml immediately.
    await svc.connect({
      host: '127.0.0.1',
      commandPort: mock.port,
      eventPort: mock.port,
      project: 'TESTPROJ',
    });
    const p = svc.getTree('254');
    // Attach the rejection assertion BEFORE disconnect so there is no window for
    // an unhandled rejection. getTree is async (project resolve then TREEXML), so
    // a disconnect that wins the race may surface as "Not connected" instead of
    // the in-flight cancel message — both mean the tree load did not hang.
    const assertion = expect(p).rejects.toThrow(/Disconnected during getTree|Not connected/);
    // disconnect() runs synchronously up to settling pending getTree calls, so
    // p rejects before the mock's TREEXML response is processed (I3).
    await svc.disconnect();
    await assertion;
  });

  const ref = { network: '254', application: '56', group: '4' };

  it('discovers the project name from PROJECT LIST', async () => {
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port });
    expect(await svc.getProjectName()).toBe('TESTPROJ');
  });

  it('prefers an explicitly configured project over discovery', async () => {
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port, project: 'MINE' });
    expect(await svc.getProjectName()).toBe('MINE');
    expect(mock.commands).not.toContain('PROJECT LIST');
  });

  it('queries live server status (greeting, PROJECT LIST, PROJECT DIR)', async () => {
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port });
    const st = await svc.getServerStatus();
    expect(st.connection).toBe('connected');
    expect(st.host).toBe('127.0.0.1');
    expect(st.commandPort).toBe(mock.port);
    expect(st.serverVersion).toBe('v2.8.0 (build 2307)');
    expect(st.activeProject).toEqual({ name: 'TESTPROJ', state: 'started' });
    expect(st.loadedProjects).toEqual([{ name: 'TESTPROJ', state: 'started' }]);
    expect(st.projectsOnDisk.map((p) => p.name)).toEqual(['TESTPROJ', 'ARCHIVE']);
    expect(mock.commands).toEqual(expect.arrayContaining(['PROJECT LIST', 'PROJECT DIR']));
  });

  it('returns a minimal status payload when disconnected', async () => {
    svc = new CgateService();
    const st = await svc.getServerStatus();
    expect(st.connection).toBe('disconnected');
    expect(st.serverVersion).toBeNull();
    expect(st.loadedProjects).toEqual([]);
  });

  it('sends ON for full level, OFF for zero, and RAMP for a mid level', async () => {
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port, project: 'P' });
    await svc.setLevel(ref, 255);
    await svc.setLevel(ref, 0);
    await svc.setLevel(ref, 128, 4);
    expect(mock.commands).toEqual(
      expect.arrayContaining([
        'ON //P/254/56/4',
        'OFF //P/254/56/4',
        'RAMP //P/254/56/4 128 4s',
      ]),
    );
  });

  it('sends TERMINATERAMP for a group', async () => {
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port, project: 'P' });
    await svc.terminateRamp(ref);
    expect(mock.commands).toContain('TERMINATERAMP //P/254/56/4');
  });

  it('fetches a group detail (label via DBGET TagName, level via GET level)', async () => {
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port, project: 'P' });
    const detail = await svc.getGroupDetail(ref);
    expect(detail).toEqual({ label: 'Tag-4', level: 200 });
    expect(mock.commands).toEqual(
      expect.arrayContaining(['DBGET //P/254/56/4/TagName', 'GET //P/254/56/4 level']),
    );
  });

  it('returns a null label for an unset (<Unused>) tag', async () => {
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port, project: 'P' });
    const detail = await svc.getGroupDetail({ network: '254', application: '56', group: '99' });
    expect(detail.label).toBeNull();
    expect(detail.level).toBe(0);
  });

  it('renames a group via DBSET TagName (C-Gate 3.x slash form) and saves the project', async () => {
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port, project: 'P' });
    await svc.setName(ref, 'Kitchen Lights');
    await svc.saveProject();
    expect(mock.commands).toContain('DBSET //P/254/56/4/TagName "Kitchen Lights"');
    expect(mock.commands).toContain('PROJECT SAVE P');
  });

  it('setTagName writes DBSET slash-form TagName', async () => {
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port, project: 'P' });
    await svc.setTagName(ref, 'Hall');
    expect(mock.commands).toContain('DBSET //P/254/56/4/TagName Hall');
  });

  it('clearTagName soft-deletes via DBSET TagName "<Unused>"', async () => {
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port, project: 'P' });
    await svc.clearTagName(ref);
    expect(mock.commands).toContain('DBSET //P/254/56/4/TagName "<Unused>"');
  });

  it('setName with blank/whitespace clears the TagName', async () => {
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port, project: 'P' });
    await svc.setName(ref, '  ');
    expect(mock.commands).toContain('DBSET //P/254/56/4/TagName "<Unused>"');
  });

  it('fetches group parameters via GET *', async () => {
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port, project: 'P' });
    const params = await svc.getGroupParams(ref);
    expect(params.Name).toBe('Kitchen');
    expect(params.Level).toBe('128');
    expect(mock.commands).toContain('GET //P/254/56/4 *');
  });

  it('rejects when C-Gate returns an error response code', async () => {
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port, project: 'P' });
    await expect(svc.sendCommand('BOGUS COMMAND')).rejects.toThrow(/C-Gate 400/);
  });

  it('serializes concurrent command-channel calls without clobbering each other (M5)', async () => {
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port, project: 'P' });
    // Fire a getTree and two commands at once; all must resolve correctly even
    // though they share the single command stream.
    const [tree, , ] = await Promise.all([
      svc.getTree('254'),
      svc.setLevel(ref, 255),
      svc.sendCommand('TERMINATERAMP //P/254/56/4'),
    ]);
    expect(tree[0].address).toBe('254');
    expect(mock.commands).toEqual(
      expect.arrayContaining(['ON //P/254/56/4', 'TERMINATERAMP //P/254/56/4']),
    );
  });

  it('reassembles event lines split across socket chunks (M6)', () => {
    svc = new CgateService();
    const states: any[] = [];
    svc.on('state', (s) => states.push(s));
    // A single event line delivered in two chunks must parse as one event.
    (svc as any).handleEventData(Buffer.from('lighting on 254/5'));
    expect(states).toHaveLength(0); // incomplete line: nothing emitted yet
    (svc as any).handleEventData(Buffer.from('6/4\n'));
    expect(states).toEqual([{ address: '254/56/4', level: 255, on: true, ramping: false }]);
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

  it('emits treeChanged with the network number when a 742 line has a network address', () => {
    svc = new CgateService();
    const changes: any[] = [];
    svc.on('treeChanged', (c) => changes.push(c));
    (svc as any).handleEventData(
      Buffer.from('742 //TESTPROJ/254/56 ObjectName "Kitchen"\n'),
    );
    expect(changes).toEqual([{ network: '254', raw: '742 //TESTPROJ/254/56 ObjectName "Kitchen"' }]);
  });

  it('emits treeChanged with network null when a 742 line has no address', () => {
    svc = new CgateService();
    const changes: any[] = [];
    svc.on('treeChanged', (c) => changes.push(c));
    (svc as any).handleEventData(
      Buffer.from('742 System event with no network path\n'),
    );
    expect(changes).toEqual([{ network: null, raw: '742 System event with no network path' }]);
  });

});
