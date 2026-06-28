import net from 'net';
const CgateConnection = require('../../src/cgate-client/cgateConnection');

interface Srv {
  server: net.Server;
  port: number;
  received: string[];
  sockets: net.Socket[];
}

async function startServer(): Promise<Srv> {
  const received: string[] = [];
  const sockets: net.Socket[] = [];
  const server = net.createServer((s) => {
    sockets.push(s);
    s.setEncoding('utf8');
    s.on('data', (d: string) => received.push(d));
    s.on('error', () => {});
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  return { server, port: (server.address() as net.AddressInfo).port, received, sockets };
}

const once = (em: any, ev: string) => new Promise((res) => em.once(ev, res));
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

describe('CgateConnection (live socket)', () => {
  let srv: Srv;
  let conn: any;
  beforeEach(async () => { srv = await startServer(); });
  afterEach(async () => {
    conn?.disconnect();
    await new Promise<void>((r) => srv.server.close(() => r()));
  });

  it('connects and sends EVENT ON for a command connection', async () => {
    conn = new CgateConnection('command', '127.0.0.1', srv.port, {});
    conn.connect();
    await once(conn, 'connect');
    expect(conn.connected).toBe(true);
    await tick();
    expect(srv.received.join('')).toContain('EVENT ON');
  });

  it('sends a LOGIN command when credentials are supplied', async () => {
    conn = new CgateConnection('command', '127.0.0.1', srv.port, {
      cgateusername: ' admin ',
      cgatepassword: 'secret',
    });
    conn.connect();
    await once(conn, 'connect');
    await tick();
    expect(srv.received.join('')).toContain('LOGIN admin secret');
  });

  it('starts keep-alive for an event connection and stops it on disconnect', async () => {
    conn = new CgateConnection('event', '127.0.0.1', srv.port, {});
    conn.connect();
    await once(conn, 'connect');
    expect(conn.keepAliveTimer).not.toBeNull();
    conn.disconnect();
    expect(conn.keepAliveTimer).toBeNull();
    expect(conn.isDestroyed).toBe(true);
    expect(conn.connected).toBe(false);
    expect(conn.socket).toBeNull();
    conn = null;
  });

  it('does not reconnect after an intentional disconnect (no late dial/log)', async () => {
    conn = new CgateConnection('command', '127.0.0.1', srv.port, {});
    conn.connect();
    await once(conn, 'connect');
    conn.disconnect();
    expect(conn.isDestroyed).toBe(true);
    const connectSpy = jest.spyOn(conn, 'connect');
    // A 'close' arriving after an intentional disconnect must NOT schedule a
    // reconnect — otherwise a destroyed connection dials a gone endpoint and
    // logs after teardown (the "Cannot log after tests are done" flake).
    conn._handleClose(true);
    expect(conn.reconnectTimeout).toBeNull();
    expect(connectSpy).not.toHaveBeenCalled();
    connectSpy.mockRestore();
    conn = null;
  });

  it('emits incoming data to listeners', async () => {
    conn = new CgateConnection('command', '127.0.0.1', srv.port, {});
    conn.connect();
    await once(conn, 'connect');
    await tick(); // allow the server to register the accepted socket
    const dataP = once(conn, 'data');
    srv.sockets[0].write('hello-from-server');
    const buf = (await dataP) as Buffer;
    expect(buf.toString()).toContain('hello-from-server');
  });

  it('send() returns false before connecting and true once connected', async () => {
    conn = new CgateConnection('command', '127.0.0.1', srv.port, {});
    expect(conn.send('PING\n')).toBe(false);
    conn.connect();
    await once(conn, 'connect');
    expect(conn.send('PING\n')).toBe(true);
    await tick();
    expect(srv.received.join('')).toContain('PING');
  });

  it('destroys a pre-existing socket before connecting', async () => {
    conn = new CgateConnection('command', '127.0.0.1', srv.port, {});
    const destroy = jest.fn();
    conn.socket = { destroyed: false, destroy } as any;
    conn.connect();
    await once(conn, 'connect');
    expect(destroy).toHaveBeenCalled();
    expect(conn.connected).toBe(true);
  });
});

describe('CgateConnection (unit branches)', () => {
  const makeConn = (type = 'command') =>
    new CgateConnection(type, '127.0.0.1', 20023, {});

  it('send() returns false when not writable', () => {
    const conn = makeConn();
    conn.socket = { destroyed: false, write: jest.fn() } as any;
    conn.connected = true;
    conn.isWritable = false;
    expect(conn.send('x')).toBe(false);
  });

  it('send() emits backpressure when the socket buffer is full', () => {
    const conn = makeConn();
    conn.socket = { destroyed: false, write: jest.fn(() => false) } as any;
    conn.connected = true;
    conn.isWritable = true;
    const bp = jest.fn();
    conn.on('backpressure', bp);
    expect(conn.send('x')).toBe(false);
    expect(conn.isWritable).toBe(false);
    expect(bp).toHaveBeenCalled();
  });

  it('send() returns false and logs when write throws', () => {
    const conn = makeConn();
    conn.socket = { destroyed: false, write: () => { throw new Error('EPIPE'); } } as any;
    conn.connected = true;
    conn.isWritable = true;
    expect(conn.send('x')).toBe(false);
  });

  it('_handleError emits error and tears down the socket', () => {
    const conn = makeConn();
    const destroy = jest.fn();
    conn.socket = { destroyed: false, destroy } as any;
    conn.connected = true;
    const onErr = jest.fn();
    conn.on('error', onErr);
    conn._handleError(new Error('boom'));
    expect(onErr).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }));
    expect(destroy).toHaveBeenCalled();
    expect(conn.connected).toBe(false);
    expect(conn.socket).toBeNull();
  });

  it('_handleTimeout destroys a live socket', () => {
    const conn = makeConn();
    const destroy = jest.fn();
    conn.socket = { destroyed: false, destroy } as any;
    conn._handleTimeout();
    expect(destroy).toHaveBeenCalled();
  });

  it('_handleDrain marks writable and resolves drain waiters', async () => {
    const conn = makeConn();
    conn.isWritable = false;
    const waiterP = conn._waitForDrain(1000);
    const onWritable = jest.fn();
    conn.on('writable', onWritable);
    conn._handleDrain();
    expect(conn.isWritable).toBe(true);
    expect(onWritable).toHaveBeenCalled();
    await expect(waiterP).resolves.toBe(true);
  });

  it('_waitForDrain resolves immediately when already writable', async () => {
    const conn = makeConn();
    conn.isWritable = true;
    await expect(conn._waitForDrain()).resolves.toBe(true);
  });

  it('sendWithBackpressure returns true on an immediate successful send', async () => {
    const conn = makeConn();
    conn.socket = { destroyed: false, write: jest.fn(() => true) } as any;
    conn.connected = true;
    conn.isWritable = true;
    await expect(conn.sendWithBackpressure('x')).resolves.toBe(true);
  });

  it('sendWithBackpressure returns false when disconnected after backpressure', async () => {
    const conn = makeConn();
    // First send fails (write returns false) -> not connected -> bail false.
    conn.socket = { destroyed: false, write: jest.fn(() => false) } as any;
    conn.connected = false;
    conn.isWritable = true;
    await expect(conn.sendWithBackpressure('x')).resolves.toBe(false);
  });

  it('_sendInitialCommands warns (no throw) when the socket is gone', () => {
    const conn = makeConn();
    conn.socket = null;
    expect(() => conn._sendInitialCommands()).not.toThrow();
  });

  describe('with fake timers', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('_scheduleReconnect schedules connect() with backoff', () => {
      const conn = makeConn();
      const connectSpy = jest.spyOn(conn, 'connect').mockReturnValue(conn);
      conn._scheduleReconnect();
      expect(conn.reconnectAttempts).toBe(1);
      expect(conn.reconnectTimeout).not.toBeNull();
      // A second call while one is pending is a no-op.
      conn._scheduleReconnect();
      expect(conn.reconnectAttempts).toBe(1);
      jest.runOnlyPendingTimers();
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it('_handleClose schedules a reconnect for unpooled connections', () => {
      const conn = makeConn();
      conn.poolIndex = -1;
      conn.socket = { removeAllListeners: jest.fn() } as any;
      const onClose = jest.fn();
      conn.on('close', onClose);
      conn._handleClose(false);
      expect(onClose).toHaveBeenCalledWith(false);
      expect(conn.reconnectTimeout).not.toBeNull();
    });

    it('_handleClose does not reconnect when pool-managed', () => {
      const conn = makeConn();
      conn.poolIndex = 3;
      conn.socket = { removeAllListeners: jest.fn() } as any;
      conn._handleClose(true);
      expect(conn.reconnectTimeout).toBeNull();
    });

    it('keep-alive pings while connected and reconnects when not', () => {
      const conn = makeConn('event');
      const write = jest.fn(() => true);
      conn.socket = { destroyed: false, write } as any;
      conn.connected = true;
      conn._startKeepAlive();
      expect(conn.keepAliveTimer).not.toBeNull();
      jest.advanceTimersByTime(conn.keepAliveInterval);
      expect(write).toHaveBeenCalledWith(expect.stringContaining('Keep-alive'));

      // Now simulate a dropped connection: the next ping should stop and reschedule.
      conn.connected = false;
      conn.isDestroyed = false;
      conn.poolIndex = -1;
      conn._sendKeepAlive();
      expect(conn.keepAliveTimer).toBeNull();
      expect(conn.reconnectTimeout).not.toBeNull();
    });
  });
});
