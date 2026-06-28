import { CgateService } from '../../src/main/CgateService';
import { startMockCgate, MockCgateHandle } from '../helpers/mockCgate';

describe('CgateService.getNetworkLevels', () => {
  let mock: MockCgateHandle;
  let svc: CgateService;

  beforeEach(async () => {
    mock = await startMockCgate();
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: mock.port, eventPort: mock.port, project: 'TESTPROJ' });
  });

  afterEach(async () => {
    await svc.disconnect();
    await mock.close();
  });

  it('returns a map of address -> level from one bulk query', async () => {
    const levels = await svc.getNetworkLevels('254');
    expect(levels['254/56/1']).toBe(0);
    expect(levels['254/56/4']).toBe(200);
    const bulk = mock.commands.find((c) => /\/\*\s+level/i.test(c));
    expect(bulk).toBe('GET //TESTPROJ/254/* level');
  });
});
