import net from 'net';
import { CgateService } from '../../src/main/CgateService';

describe('CgateService edge cases', () => {
  it('getTree rejects when not connected', async () => {
    const svc = new CgateService();
    await expect(svc.getTree('254')).rejects.toThrow('Not connected');
    expect(svc.getStatus()).toBe('disconnected');
  });

  describe('against a server that returns malformed TREEXML', () => {
    let server: net.Server;
    let port: number;
    let svc: CgateService;

    beforeEach(async () => {
      server = net.createServer((s) => {
        s.setEncoding('utf8');
        s.on('error', () => {});
        let buffer = '';
        s.on('data', (chunk: string) => {
          buffer += chunk;
          let idx;
          while ((idx = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, idx).replace(/\r$/, '');
            buffer = buffer.slice(idx + 1);
            if (/^EVENT ON|^LOGIN|^#/i.test(line)) s.write('200 OK.\r\n');
            else if (/^TREEXML/i.test(line)) s.write('343-Begin\r\n343-<Network\r\n344 End.\r\n');
          }
        });
      });
      await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
      port = (server.address() as net.AddressInfo).port;
    });

    afterEach(async () => {
      await svc?.disconnect();
      await new Promise<void>((r) => server.close(() => r()));
    });

    it('rejects getTree with a parse error', async () => {
      svc = new CgateService();
      await svc.connect({ host: '127.0.0.1', commandPort: port, eventPort: port });
      await expect(svc.getTree('254')).rejects.toThrow('TREEXML parse error');
    });
  });
});
