import { CgateService } from '../../src/main/CgateService';
import { startMockCgate, MockCgateHandle } from '../helpers/mockCgate';
import type { TriggerActivity, GroupState } from '../../src/shared/types';

describe('CgateService trigger events', () => {
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

  it('emits "trigger" (not "state") for a trigger-control event', async () => {
    const trigger = new Promise<TriggerActivity>((resolve) => svc.once('trigger', resolve));
    let stateSeen = false;
    svc.on('state', () => { stateSeen = true; });

    mock.pushEvent('trigger on 254/202/1 5');

    const act = await trigger;
    expect(act).toEqual({ address: '254/202/1', network: '254', application: '202', group: '1', actionSelector: 5 });
    expect(stateSeen).toBe(false);
  });

  it('still emits "state" for a lighting event', async () => {
    const state = new Promise<GroupState>((resolve) => svc.once('state', resolve));
    mock.pushEvent('lighting on 254/56/4');
    const st = await state;
    expect(st).toEqual({ address: '254/56/4', level: 255, on: true, ramping: false });
  });
});
