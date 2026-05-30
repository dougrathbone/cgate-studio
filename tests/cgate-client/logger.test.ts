const { Logger, createLogger, logger, error, warn, info, debug } =
  require('../../src/cgate-client/logger');

describe('Logger', () => {
  const spies: jest.SpyInstance[] = [];
  beforeEach(() => {
    spies.push(
      jest.spyOn(console, 'log').mockImplementation(() => {}),
      jest.spyOn(console, 'warn').mockImplementation(() => {}),
      jest.spyOn(console, 'error').mockImplementation(() => {}),
      jest.spyOn(console, 'debug').mockImplementation(() => {}),
    );
  });
  afterEach(() => { spies.forEach((s) => s.mockRestore()); spies.length = 0; });

  it('defaults the component name and enabled flag', () => {
    const l = new Logger();
    expect(l.component).toBe('cgateweb');
    expect(l.enabled).toBe(true);
  });

  it('respects an explicit level option over env', () => {
    const l = new Logger({ level: 'debug' });
    expect(l.level).toBe('debug');
    expect(l.isLevelEnabled('debug')).toBe(true);
    expect(l.isLevelEnabled('trace')).toBe(false);
  });

  it('suppresses logs below the current level', () => {
    const l = new Logger({ level: 'warn' });
    l.info('hidden');
    expect(console.log).not.toHaveBeenCalled();
    l.warn('shown');
    expect(console.warn).toHaveBeenCalledTimes(1);
  });

  it('routes each level to the matching console method', () => {
    const l = new Logger({ level: 'trace' });
    l.error('e');
    l.warn('w');
    l.info('i');
    l.debug('d');
    l.trace('t');
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.warn).toHaveBeenCalledTimes(1);
    expect(console.log).toHaveBeenCalledTimes(1); // info
    expect(console.debug).toHaveBeenCalledTimes(2); // debug + trace
  });

  it('emits nothing when disabled', () => {
    const l = new Logger({ level: 'trace', enabled: false });
    l.error('nope');
    expect(console.error).not.toHaveBeenCalled();
    expect(l.isLevelEnabled('error')).toBe(false);
  });

  it('includes metadata in the formatted message', () => {
    const l = new Logger({ level: 'info' });
    l.info('with meta', { a: 1 });
    const line = (console.log as jest.Mock).mock.calls[0][0];
    expect(line).toContain('with meta');
    expect(line).toContain('"a": 1');
  });

  it('applies ANSI colors when enabled', () => {
    const l = new Logger({ level: 'info' });
    l.enableColors = true;
    l.info('colored');
    const line = (console.log as jest.Mock).mock.calls[0][0];
    expect(line).toContain('\x1b['); // contains an ANSI escape sequence
  });

  it('uses a compact metadata format outside verbose mode', () => {
    const l = new Logger({ level: 'info' });
    l.enableVerbose = false;
    l.info('msg', { a: 1, b: 2 });
    const line = (console.log as jest.Mock).mock.calls[0][0];
    expect(line).toContain('{"a":1,"b":2}'); // single-line JSON, not pretty-printed
  });

  it('setLevel changes the active threshold (and ignores unknown levels)', () => {
    const l = new Logger({ level: 'error' });
    l.setLevel('debug');
    expect(l.level).toBe('debug');
    l.setLevel('bogus');
    expect(l.level).toBe('debug');
  });

  it('child() inherits component/level unless overridden', () => {
    const parent = new Logger({ component: 'parent', level: 'warn' });
    const child = parent.child({ component: 'child' });
    expect(child.component).toBe('child');
    expect(child.level).toBe('warn');
    const inherited = parent.child();
    expect(inherited.component).toBe('parent');
  });

  it('time()/timeEnd() are safe to call', () => {
    const t = jest.spyOn(console, 'time').mockImplementation(() => {});
    const te = jest.spyOn(console, 'timeEnd').mockImplementation(() => {});
    const l = new Logger();
    l.isDevelopment = true;
    l.time('x');
    l.timeEnd('x');
    expect(t).toHaveBeenCalled();
    expect(te).toHaveBeenCalled();
    t.mockRestore();
    te.mockRestore();
  });

  it('reads LOG_LEVEL from the environment when no option is given', () => {
    const prev = process.env.LOG_LEVEL;
    process.env.LOG_LEVEL = 'error';
    const l = new Logger();
    expect(l.level).toBe('error');
    if (prev === undefined) delete process.env.LOG_LEVEL;
    else process.env.LOG_LEVEL = prev;
  });

  it('exposes a default logger and convenience exports', () => {
    expect(logger).toBeInstanceOf(Logger);
    expect(() => { error('e'); warn('w'); info('i'); debug('d'); }).not.toThrow();
  });

  it('createLogger builds a configured instance', () => {
    expect(createLogger({ component: 'svc' }).component).toBe('svc');
  });
});
