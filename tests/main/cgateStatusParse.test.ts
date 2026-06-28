import {
  parseServerVersion,
  parseProjectLines,
  resolveActiveProject,
  isServiceReadyLine,
} from '../../src/main/cgateStatusParse';

describe('cgateStatusParse', () => {
  it('parseServerVersion extracts version from a service-ready greeting', () => {
    const line = '201 Service ready: Clipsal C-Gate Version: v2.8.0 (build 2307) #cmd-syntax=1.0';
    expect(parseServerVersion(line)).toBe('v2.8.0 (build 2307)');
  });

  it('parseProjectLines reads project and state fields', () => {
    expect(parseProjectLines([
      '123 project=MYPROJ state=started',
      '123 project=OTHER state=stopped',
      '124 no projects found',
    ])).toEqual([
      { name: 'MYPROJ', state: 'started' },
      { name: 'OTHER', state: 'stopped' },
    ]);
  });

  it('resolveActiveProject prefers the cached project name', () => {
    const loaded = [{ name: 'TESTPROJ', state: 'started' }, { name: 'OTHER', state: 'stopped' }];
    expect(resolveActiveProject(loaded, 'TESTPROJ')).toEqual({ name: 'TESTPROJ', state: 'started' });
  });

  it('resolveActiveProject falls back to started then first project', () => {
    const loaded = [{ name: 'A', state: 'stopped' }, { name: 'B', state: 'started' }];
    expect(resolveActiveProject(loaded, null)).toEqual({ name: 'B', state: 'started' });
    expect(resolveActiveProject([{ name: 'A', state: 'stopped' }], null)).toEqual({ name: 'A', state: 'stopped' });
  });

  it('isServiceReadyLine detects greeting lines', () => {
    expect(isServiceReadyLine('201 Service ready: Clipsal C-Gate Version: v2.8.0')).toBe(true);
    expect(isServiceReadyLine('200 OK.')).toBe(false);
  });

  it('parseServerVersion returns null for null/undefined/empty input', () => {
    expect(parseServerVersion(null)).toBeNull();
    expect(parseServerVersion(undefined)).toBeNull();
    expect(parseServerVersion('')).toBeNull();
  });

  it('parseServerVersion returns null when greeting has no Version token', () => {
    expect(parseServerVersion('200 OK. Some other line')).toBeNull();
  });

  it('resolveActiveProject returns a synthetic entry when cached name is not in loaded list', () => {
    const loaded = [{ name: 'OTHER', state: 'started' }];
    expect(resolveActiveProject(loaded, 'MINE')).toEqual({ name: 'MINE', state: null });
  });

  it('resolveActiveProject returns null when no projects are loaded and no name is cached', () => {
    expect(resolveActiveProject([], null)).toBeNull();
  });
});
