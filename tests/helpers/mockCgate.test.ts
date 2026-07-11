import net from 'net';
import { startMockCgate } from './mockCgate';

async function sendAndCollect(port: number, cmd: string, doneWhen: (buf: string) => boolean): Promise<string> {
  return new Promise((resolve) => {
    const sock = net.createConnection(port, '127.0.0.1', () => {
      sock.write(`${cmd}\r\n`);
    });
    let buf = '';
    sock.setEncoding('utf8');
    sock.on('data', (d: string) => {
      buf += d;
      if (doneWhen(buf)) {
        sock.end();
        resolve(buf);
      }
    });
  });
}

describe('mock C-Gate', () => {
  it('responds to TREEXML with the fixture', async () => {
    const mock = await startMockCgate();
    const data = await sendAndCollect(mock.port, 'TREEXML 254', (buf) => buf.includes('344'));
    expect(data).toContain('<NetworkNumber>254</NetworkNumber>');
    await mock.close();
  });

  it('responds to project-qualified TREEXML', async () => {
    const mock = await startMockCgate();
    const data = await sendAndCollect(
      mock.port,
      'TREEXML //TESTPROJ/254',
      (buf) => buf.includes('344'),
    );
    expect(data).toContain('<NetworkNumber>254</NetworkNumber>');
    expect(mock.commands).toContain('TREEXML //TESTPROJ/254');
    await mock.close();
  });

  it('lists projects on disk and loaded projects', async () => {
    const mock = await startMockCgate();
    const dir = await sendAndCollect(mock.port, 'PROJECT DIR', (buf) => /123 project=ARCHIVE/i.test(buf));
    expect(dir).toMatch(/project=TESTPROJ/i);
    expect(dir).toMatch(/project=ARCHIVE/i);

    const list = await sendAndCollect(mock.port, 'PROJECT LIST', (buf) => /123 project=TESTPROJ/i.test(buf));
    expect(list).toMatch(/project=TESTPROJ.*state=started/i);
    await mock.close();
  });

  it('accepts PROJECT LOAD/START/USE and NET LIST', async () => {
    const mock = await startMockCgate();
    for (const cmd of ['PROJECT LOAD TESTPROJ', 'PROJECT START TESTPROJ', 'PROJECT USE TESTPROJ']) {
      const res = await sendAndCollect(mock.port, cmd, (buf) => /200 /.test(buf));
      expect(res).toMatch(/200 OK/i);
    }
    const nets = await sendAndCollect(mock.port, 'NET LIST', (buf) => /131 network=254/i.test(buf));
    expect(nets).toMatch(/network=254/i);
    expect(mock.commands).toEqual(
      expect.arrayContaining([
        'PROJECT LOAD TESTPROJ',
        'PROJECT START TESTPROJ',
        'PROJECT USE TESTPROJ',
        'NET LIST',
      ]),
    );
    await mock.close();
  });
});
