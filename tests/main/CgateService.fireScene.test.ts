import { CgateService } from '../../src/main/CgateService';
import { startMockCgate, MockCgateHandle } from '../helpers/mockCgate';

describe('CgateService.fireScene', () => {
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

  it('sends a trigger command with the action selector to the trigger group path', async () => {
    const res = await svc.fireScene({ network: '254', application: '202', group: '1' }, 5);
    expect(res.code).toBe(200);
    const fired = mock.commands.find((c) => /^TRIGGER/i.test(c));
    expect(fired).toBe('TRIGGER EVENT //TESTPROJ/254/202/1 5');
  });

  it('clamps action selector 300 to 255', async () => {
    const res = await svc.fireScene({ network: '254', application: '202', group: '2' }, 300);
    expect(res.code).toBe(200);
    const fired = mock.commands.find((c) => /^TRIGGER/i.test(c));
    expect(fired).toBe('TRIGGER EVENT //TESTPROJ/254/202/2 255');
  });

  it('clamps action selector -1 to 0', async () => {
    const res = await svc.fireScene({ network: '254', application: '202', group: '3' }, -1);
    expect(res.code).toBe(200);
    const fired = mock.commands.find((c) => /^TRIGGER/i.test(c));
    expect(fired).toBe('TRIGGER EVENT //TESTPROJ/254/202/3 0');
  });

  it('rounds action selector 4.7 to 5', async () => {
    const res = await svc.fireScene({ network: '254', application: '202', group: '4' }, 4.7);
    expect(res.code).toBe(200);
    const fired = mock.commands.find((c) => /^TRIGGER/i.test(c));
    expect(fired).toBe('TRIGGER EVENT //TESTPROJ/254/202/4 5');
  });
});
