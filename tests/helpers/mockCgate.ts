import net from 'net';
import fs from 'fs';
import path from 'path';

export interface MockCgateHandle {
  port: number;
  close: () => Promise<void>;
  // Push a raw line (CRLF appended) to all connected event-port clients.
  pushEvent: (line: string) => void;
}

// Starts a fake C-Gate on an ephemeral port. The command port answers
// `EVENT ON`/`LOGIN` with `200 OK`, answers `TREEXML <n>` with the fixture,
// and stores the latest socket so tests can push events to it.
export async function startMockCgate(): Promise<MockCgateHandle> {
  const fixture = fs.readFileSync(
    path.join(__dirname, '..', 'fixtures', 'treexml-254.txt'),
    'utf8',
  );
  const clients = new Set<net.Socket>();

  const server = net.createServer((socket) => {
    clients.add(socket);
    socket.on('close', () => clients.delete(socket));
    socket.setEncoding('utf8');
    let buffer = '';
    socket.on('data', (chunk: string) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, idx).replace(/\r$/, '');
        buffer = buffer.slice(idx + 1);
        if (/^EVENT ON/i.test(line) || /^LOGIN/i.test(line) || line.startsWith('#')) {
          socket.write('200 OK.\r\n');
        } else if (/^TREEXML/i.test(line)) {
          socket.write(fixture.endsWith('\n') ? fixture : fixture + '\n');
        }
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as net.AddressInfo).port;

  return {
    port,
    close: () =>
      new Promise<void>((resolve) => {
        for (const c of clients) c.destroy();
        server.close(() => resolve());
      }),
    pushEvent: (line: string) => {
      for (const c of clients) {
        if (!c.destroyed) c.write(line + '\r\n');
      }
    },
  };
}
