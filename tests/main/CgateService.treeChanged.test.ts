import { CgateService } from '../../src/main/CgateService';
import { startMockCgate, MockCgateHandle } from '../helpers/mockCgate';
import type { TreeChange } from '../../src/shared/types';

describe('CgateService 742 tree-changed events', () => {
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

  it('emits treeChanged with the parsed network for a 742 line', async () => {
    const changed = new Promise<TreeChange>((resolve) => svc.once('treeChanged', resolve));
    mock.pushEvent('742 //TESTPROJ/254/56/4 object modified');
    const tc = await changed;
    expect(tc.network).toBe('254');
    expect(tc.raw).toBe('742 //TESTPROJ/254/56/4 object modified');
  });

  it('does not emit state or trigger for a 742 line', async () => {
    let other = false;
    svc.on('state', () => { other = true; });
    svc.on('trigger', () => { other = true; });
    const changed = new Promise<void>((resolve) => svc.once('treeChanged', () => resolve()));
    mock.pushEvent('742 //TESTPROJ/254/56/4 object modified');
    await changed;
    expect(other).toBe(false);
  });
});
