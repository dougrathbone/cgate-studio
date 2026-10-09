import {
  assertActionSelector,
  assertConnectOptions,
  assertGroupRef,
  assertLabelImport,
  assertLevel,
  assertParamName,
  assertSiteInput,
  assertToken,
  IpcValidationError,
  MAX_LABEL_MAP_ENTRIES,
} from '../../src/main/ipcValidate';

describe('ipcValidate', () => {
  it('accepts Toolkit-safe project tokens', () => {
    expect(assertToken('5COGAN')).toBe('5COGAN');
    expect(assertToken('my_proj-1')).toBe('my_proj-1');
  });

  it('rejects project tokens with spaces or metacharacters', () => {
    expect(() => assertToken('bad name')).toThrow(IpcValidationError);
    expect(() => assertToken('a;b')).toThrow(IpcValidationError);
    expect(() => assertToken('')).toThrow(IpcValidationError);
  });

  it('validates GroupRef address segments', () => {
    expect(assertGroupRef({ network: '254', application: '56', group: '4' })).toEqual({
      network: '254',
      application: '56',
      group: '4',
    });
    expect(() => assertGroupRef({ network: 'x', application: '56', group: '4' })).toThrow(
      IpcValidationError,
    );
  });

  it('validates SET param names and levels', () => {
    expect(assertParamName('RampTime')).toBe('RampTime');
    expect(() => assertParamName('Ramp Time')).toThrow(IpcValidationError);
    expect(() => assertParamName('a\nb')).toThrow(IpcValidationError);
    expect(assertLevel(300)).toBe(255);
    expect(assertActionSelector(-1)).toBe(0);
  });

  it('validates connect options and site input', () => {
    expect(
      assertConnectOptions({ host: '10.0.0.1', commandPort: 20023, eventPort: 20025 }),
    ).toMatchObject({ host: '10.0.0.1' });
    expect(() =>
      assertConnectOptions({ host: 'h\n', commandPort: 20023, eventPort: 20025 }),
    ).toThrow(IpcValidationError);
    expect(
      assertSiteInput({
        name: 'Home',
        host: '127.0.0.1',
        commandPort: 20023,
        eventPort: 20025,
        defaultProject: 'PROJ',
        defaultNetwork: '254',
      }),
    ).toMatchObject({ defaultProject: 'PROJ', defaultNetwork: '254' });
  });

  it('caps label import map size', () => {
    const groups: Record<string, string> = {};
    for (let i = 0; i < MAX_LABEL_MAP_ENTRIES + 1; i++) groups[String(i)] = 'x';
    expect(() =>
      assertLabelImport({
        source: 'x',
        networks: {},
        applications: {},
        groups,
        stats: { networkCount: 0, groupCount: 0, labelCount: 0 },
      }),
    ).toThrow(/too large/i);
  });

  it('validates ramp secs and site id', () => {
    const { assertOptionalRampSecs, assertSite } = require('../../src/main/ipcValidate');
    expect(assertOptionalRampSecs(undefined)).toBeUndefined();
    expect(assertOptionalRampSecs(4)).toBe(4);
    expect(() => assertOptionalRampSecs(-1)).toThrow(IpcValidationError);
    expect(() => assertOptionalRampSecs(99999)).toThrow(IpcValidationError);
    expect(
      assertSite({
        id: 'abc',
        name: 'Home',
        host: '127.0.0.1',
        commandPort: 20023,
        eventPort: 20025,
      }),
    ).toMatchObject({ id: 'abc' });
    expect(() =>
      assertSite({
        id: '',
        name: 'Home',
        host: '127.0.0.1',
        commandPort: 20023,
        eventPort: 20025,
      }),
    ).toThrow(IpcValidationError);
  });

  it('rejects bad ports and default tokens', () => {
    expect(() =>
      assertConnectOptions({ host: '127.0.0.1', commandPort: 0, eventPort: 20025 }),
    ).toThrow(IpcValidationError);
    expect(() =>
      assertConnectOptions({ host: '127.0.0.1', commandPort: 20023, eventPort: 70000 }),
    ).toThrow(IpcValidationError);
    expect(() =>
      assertSiteInput({
        name: 'Home',
        host: '127.0.0.1',
        commandPort: 20023,
        eventPort: 20025,
        defaultNetwork: '254!',
      }),
    ).toThrow(IpcValidationError);
    expect(
      assertLabelImport({
        source: 'a.cbz',
        networks: { '254': 'Home' },
        applications: { '254/56': 'Lighting' },
        groups: { '254/56/1': 'Hall' },
        stats: { networkCount: 1, groupCount: 1, labelCount: 1 },
      }).groups['254/56/1'],
    ).toBe('Hall');
  });
});
