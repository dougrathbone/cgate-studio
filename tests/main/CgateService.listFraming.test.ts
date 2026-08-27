import net from 'net';
import { CgateService } from '../../src/main/CgateService';

/**
 * C-Gate 3.3.2 ends PROJECT LIST / DIR and NET LIST on the space-form item
 * line itself — there is no trailing `200 OK`. Older mocks (and some servers)
 * append `200 OK`; both must work.
 */
describe('CgateService list framing (C-Gate 3.x)', () => {
  let server: net.Server;
  let port: number;
  let svc: CgateService;

  beforeEach(async () => {
    server = net.createServer((s) => {
      s.setEncoding('utf8');
      s.on('error', () => {});
      s.write('201 Service ready: Clipsal C-Gate Version: v3.3.2 (build 1855) #cmd-syntax=1.0\r\n');
      let buffer = '';
      s.on('data', (chunk: string) => {
        buffer += chunk;
        let idx;
        while ((idx = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, idx).replace(/\r$/, '');
          buffer = buffer.slice(idx + 1);
          if (/^EVENT\b|^LOGIN|^#/i.test(line)) {
            s.write('200 OK.\r\n');
          } else if (/^PROJECT LIST/i.test(line)) {
            s.write('123 project=5COGAN state=started\r\n');
          } else if (/^PROJECT DIR/i.test(line)) {
            s.write('123 project=5COGAN\r\n');
          } else if (/^NET LIST/i.test(line)) {
            s.write('131 network=254 State=ok InterfaceState=running\r\n');
          } else if (/^PROJECT (LOAD|START|USE)\b/i.test(line)) {
            s.write('200 OK.\r\n');
          } else if (/^DBGET\s+\S+\/TagName$/i.test(line)) {
            s.write('342 254/56/4/TagName=Kitchen Lights\r\n');
          } else if (/^DBGET\s+\S+\s+TagName$/i.test(line)) {
            s.write('400 Syntax Error: Too many parameters\r\n');
          } else if (/^GET\s+\S+\s+level$/i.test(line)) {
            s.write('300 //5COGAN/254/56/4: level=128\r\n');
          }
        }
      });
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    port = (server.address() as net.AddressInfo).port;
    svc = new CgateService();
    await svc.connect({ host: '127.0.0.1', commandPort: port, eventPort: port });
  });

  afterEach(async () => {
    await svc?.disconnect();
    await new Promise<void>((r) => server.close(() => r()));
  });

  it('lists loaded projects when the reply has no trailing 200 OK', async () => {
    await expect(svc.listLoadedProjects()).resolves.toEqual([
      { name: '5COGAN', state: 'started' },
    ]);
  });

  it('lists projects on disk when the reply has no trailing 200 OK', async () => {
    await expect(svc.listProjectsOnDisk()).resolves.toEqual([
      { name: '5COGAN', state: null },
    ]);
  });

  it('lists networks when the reply has no trailing 200 OK', async () => {
    await expect(svc.listNetworks()).resolves.toEqual([
      {
        address: '254',
        state: 'ok',
        interfaceState: 'running',
        syncState: null,
      },
    ]);
  });

  it('reads group labels via C-Gate 3.x DBGET path/TagName', async () => {
    await svc.useProject('5COGAN');
    await expect(
      svc.getGroupDetail({ network: '254', application: '56', group: '4' }),
    ).resolves.toEqual({ label: 'Kitchen Lights', level: 128 });
  });
});
