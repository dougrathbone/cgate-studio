import { CgateService } from '../../src/main/CgateService';
import { startMockCgate, MockCgateHandle } from '../helpers/mockCgate';
import type { MeasurementState, GroupState } from '../../src/shared/types';

describe('CgateService measurement events', () => {
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

  it('emits "measurement" (not "state") for a measurement event', async () => {
    const measurement = new Promise<MeasurementState>((resolve) => svc.once('measurement', resolve));
    let stateSeen = false;
    svc.on('state', () => { stateSeen = true; });

    mock.pushEvent('measurement 254/228/1 25.5 units=2');

    const m = await measurement;
    expect(m).toEqual({
      address: '254/228/1', network: '254', application: '228',
      channel: '1', value: 25.5, units: '2',
    });
    expect(stateSeen).toBe(false);
  });

  it('still emits "state" for a lighting event', async () => {
    const state = new Promise<GroupState>((resolve) => svc.once('state', resolve));
    mock.pushEvent('lighting on 254/56/4');
    const st = await state;
    expect(st.address).toBe('254/56/4');
  });
});
