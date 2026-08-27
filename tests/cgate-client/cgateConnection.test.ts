import net from 'net';
const { CgateConnection, constants } = require('cgateweb/cgate-client');

interface Srv {
  server: net.Server;
  port: number;
  received: string[];
}

async function startServer(): Promise<Srv> {
  const received: string[] = [];
  const server = net.createServer((s) => {
    s.setEncoding('utf8');
    s.on('data', (d: string) => received.push(d));
    s.on('error', () => {});
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  return { server, port: (server.address() as net.AddressInfo).port, received };
}

const once = (em: any, ev: string) => new Promise((res) => em.once(ev, res));
const tick = (ms = 40) => new Promise((r) => setTimeout(r, ms));

describe('cgateweb CgateConnection (protocol contract)', () => {
  let srv: Srv;
  let conn: any;
  beforeEach(async () => { srv = await startServer(); });
  afterEach(async () => {
    conn?.disconnect();
    await new Promise<void>((r) => srv.server.close(() => r()));
  });

  it('connects and sends EVENT e6s0c0 for a command connection', async () => {
    conn = new CgateConnection('command', '127.0.0.1', srv.port, {});
    conn.connect();
    await once(conn, 'connect');
    expect(conn.connected).toBe(true);
    await tick();
    expect(srv.received.join('')).toContain(constants.CGATE_CMD_EVENT_MODE_L6);
  });

  it('sends LOGIN when credentials are supplied', async () => {
    conn = new CgateConnection('command', '127.0.0.1', srv.port, {
      cgateusername: 'admin',
      cgatepassword: 'secret',
    });
    conn.connect();
    await once(conn, 'connect');
    await tick();
    expect(srv.received.join('')).toContain('LOGIN admin secret');
  });

  it('does not reconnect after an intentional disconnect', async () => {
    conn = new CgateConnection('command', '127.0.0.1', srv.port, {});
    conn.connect();
    await once(conn, 'connect');
    conn.disconnect();
    expect(conn.isDestroyed).toBe(true);
    const connectSpy = jest.spyOn(conn, 'connect');
    await tick(80);
    expect(connectSpy).not.toHaveBeenCalled();
    connectSpy.mockRestore();
    conn = null;
  });
});
