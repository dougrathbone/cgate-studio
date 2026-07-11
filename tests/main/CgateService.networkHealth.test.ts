import { CgateService } from '../../src/main/CgateService';
import { startMockCgate, type MockCgateHandle } from '../helpers/mockCgate';

describe('CgateService network health (M7)', () => {
  let mock: MockCgateHandle;
  let svc: CgateService;

  beforeEach(async () => {
    mock = await startMockCgate();
    svc = new CgateService();
    await svc.connect({
      host: '127.0.0.1',
      commandPort: mock.port,
      eventPort: mock.port,
      project: 'TESTPROJ',
    });
  });

  afterEach(async () => {
    await svc.disconnect();
    await mock.close();
  });

  it('opens, syncs, and refreshes network health', async () => {
    await svc.openNetwork('254');
    await svc.syncNetwork('254');
    const health = await svc.refreshNetworkHealth('254');
    expect(health).toMatchObject({
      address: '254',
      state: 'ok',
      interfaceState: 'running',
      syncState: 'idle',
    });
    expect(mock.commands).toEqual(
      expect.arrayContaining([
        'NET OPEN 254',
        'DO 254 SYNC',
        expect.stringMatching(/^GET \/\/TESTPROJ\/254 State$/i),
      ]),
    );
  });

  it('appends FORCE to lighting commands when State=new', async () => {
    // Seed health cache via remember path: refresh then override by syncing list
    // with a custom mock response is hard; instead call remember via list after
    // manually setting — use refresh then patch by sending setLevel after
    // injecting health through listNetworks with a one-off: call private via
    // refresh and then use a second service method. Simpler: setLevel without
    // force when ok, and force when we fake health by open+manual map.
    (svc as any).networkHealth.set('254', {
      address: '254',
      state: 'new',
      interfaceState: 'running',
      syncState: 'idle',
    });
    mock.commands.length = 0;
    await svc.setLevel({ network: '254', application: '56', group: '4' }, 255);
    expect(mock.commands.some((c) => /ON .+ FORCE$/i.test(c))).toBe(true);
  });

  it('emits activity entries for commands', async () => {
    const seen: string[] = [];
    svc.on('activity', (a: { text: string }) => seen.push(a.text));
    await svc.listNetworks();
    expect(seen.some((t) => /NET LIST/i.test(t))).toBe(true);
    expect(svc.getActivityLog().length).toBeGreaterThan(0);
  });
});
