import { CgateService } from '../../src/main/CgateService';
import { startMockCgate, type MockCgateHandle } from '../helpers/mockCgate';

describe('CgateService session (M6)', () => {
  let mock: MockCgateHandle;
  let svc: CgateService;

  beforeEach(async () => {
    mock = await startMockCgate();
    svc = new CgateService();
    await svc.connect({
      host: '127.0.0.1',
      commandPort: mock.port,
      eventPort: mock.port,
    });
  });

  afterEach(async () => {
    await svc.disconnect();
    await mock.close();
  });

  it('lists projects on disk and loaded projects', async () => {
    const onDisk = await svc.listProjectsOnDisk();
    expect(onDisk.map((p) => p.name)).toEqual(expect.arrayContaining(['TESTPROJ', 'ARCHIVE']));

    const loaded = await svc.listLoadedProjects();
    expect(loaded).toEqual([{ name: 'TESTPROJ', state: 'started' }]);
  });

  it('load/start/use project and caches the name', async () => {
    await svc.loadProject('TESTPROJ');
    await svc.startProject('TESTPROJ');
    await svc.useProject('TESTPROJ');
    expect(await svc.getProjectName()).toBe('TESTPROJ');
    expect(mock.commands).toEqual(
      expect.arrayContaining([
        'PROJECT LOAD TESTPROJ',
        'PROJECT START TESTPROJ',
        'PROJECT USE TESTPROJ',
      ]),
    );
  });

  it('lists networks from NET LIST', async () => {
    const nets = await svc.listNetworks();
    expect(nets).toEqual([
      {
        address: '254',
        state: 'ok',
        interfaceState: 'running',
        syncState: 'idle',
      },
    ]);
  });

  it('getTree prefers project-qualified TREEXML when project is known', async () => {
    await svc.useProject('TESTPROJ');
    mock.commands.length = 0;
    const tree = await svc.getTree('254');
    expect(tree[0]?.address).toBe('254');
    expect(mock.commands.some((c) => /^TREEXML \/\/TESTPROJ\/254$/i.test(c))).toBe(true);
  });
});
