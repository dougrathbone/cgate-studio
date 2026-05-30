import net from 'net';
import { startMockCgate } from './mockCgate';

describe('mock C-Gate', () => {
  it('responds to TREEXML with the fixture', async () => {
    const mock = await startMockCgate();
    const data: string = await new Promise((resolve) => {
      const sock = net.createConnection(mock.port, '127.0.0.1', () => {
        sock.write('TREEXML 254\r\n');
      });
      let buf = '';
      sock.setEncoding('utf8');
      sock.on('data', (d: string) => {
        buf += d;
        if (buf.includes('344')) { sock.end(); resolve(buf); }
      });
    });
    expect(data).toContain('<NetworkNumber>254</NetworkNumber>');
    await mock.close();
  });
});
