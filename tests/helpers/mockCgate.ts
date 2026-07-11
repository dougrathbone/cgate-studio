import net from 'net';
import fs from 'fs';
import path from 'path';

export interface MockCgateHandle {
  port: number;
  close: () => Promise<void>;
  // Push a raw line (CRLF appended) to all connected event-port clients.
  pushEvent: (line: string) => void;
  // Command lines received from clients (excludes EVENT ON / LOGIN / keep-alive
  // handshake noise), so tests can assert exactly what was sent.
  commands: string[];
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
  const commands: string[] = [];

  const server = net.createServer((socket) => {
    clients.add(socket);
    socket.on('close', () => clients.delete(socket));
    socket.setEncoding('utf8');
    socket.write('201 Service ready: Clipsal C-Gate Version: v2.8.0 (build 2307) #cmd-syntax=1.0\r\n');
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
          commands.push(line);
          socket.write(fixture.endsWith('\n') ? fixture : fixture + '\n');
        } else if (/^PROJECT LIST/i.test(line)) {
          commands.push(line);
          socket.write('123 project=TESTPROJ state=started\r\n200 OK.\r\n');
        } else if (/^PROJECT DIR/i.test(line)) {
          commands.push(line);
          socket.write('123-project=TESTPROJ\r\n123 project=ARCHIVE\r\n200 OK.\r\n');
        } else if (/^PROJECT (LOAD|START|USE|SAVE)\b/i.test(line)) {
          commands.push(line);
          socket.write('200 OK.\r\n');
        } else if (/^NET LIST/i.test(line)) {
          commands.push(line);
          socket.write(
            '131 network=254 State=ok InterfaceState=running SyncState=idle\r\n200 OK.\r\n',
          );
        } else if (/^DBGET /i.test(line)) {
          commands.push(line);
          const objPath = line.split(/\s+/)[1] ?? '';
          const group = objPath.split('/').pop() ?? '';
          // Group 99 simulates an unset tag; others return a deterministic label.
          const tag = group === '99' ? '<Unused>' : `Tag-${group}`;
          socket.write(`300 ${objPath} TagName="${tag}"\r\n`);
        } else if (/^GET .+\s+\*/i.test(line)) {
          commands.push(line);
          const objPath = line.split(/\s+/)[1] ?? '';
          const isUnit = /\/\d+\/p\/\d/i.test(objPath);
          if (isUnit) {
            socket.write(`300 ${objPath}: Name="KITCHEN DIMMER" CatalogNumber=DIMDC8 Firmware=1.0\r\n`);
          } else {
            const group = objPath.split('/').pop() ?? '';
            const level = group === '4' ? 128 : 0;
            const name = group === '4' ? 'Kitchen' : '';
            socket.write(
              `300 ${objPath}: Name="${name}" Level=${level} State=on RampTime=4 Protected=no EventLevel=5 Type=light Units=10,14\r\n`,
            );
          }
        } else if (/^GET\s+\S*\/\*\s+level/i.test(line)) {
          commands.push(line);
          socket.write('300- //TESTPROJ/254/56/1: level=0\r\n');
          socket.write('300 //TESTPROJ/254/56/4: level=200\r\n');
        } else if (/^GET .*\blevel\b/i.test(line)) {
          commands.push(line);
          const objPath = line.split(/\s+/)[1] ?? '';
          const group = objPath.split('/').pop() ?? '';
          const level = group === '4' ? 200 : 0;
          socket.write(`300 ${objPath}: level=${level}\r\n`);
        } else if (/^(ON|OFF|RAMP|TERMINATERAMP|SET|TRIGGER) /i.test(line)) {
          commands.push(line);
          socket.write('200 OK.\r\n');
        } else if (line.trim()) {
          commands.push(line);
          socket.write('400 Syntax Error.\r\n');
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
    commands,
  };
}
