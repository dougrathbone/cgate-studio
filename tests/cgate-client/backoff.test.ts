const { backoffDelay } = require('../../src/cgate-client/backoff');

describe('backoffDelay', () => {
  it('returns the initial delay for retry 0 without jitter', () => {
    expect(backoffDelay(0, { jitter: false })).toBe(1000);
  });

  it('doubles exponentially per retry without jitter', () => {
    expect(backoffDelay(1, { jitter: false })).toBe(2000);
    expect(backoffDelay(3, { jitter: false })).toBe(8000);
  });

  it('caps the delay at maxMs', () => {
    expect(backoffDelay(20, { jitter: false, maxMs: 60000 })).toBe(60000);
  });

  it('honours a custom initialMs', () => {
    expect(backoffDelay(0, { jitter: false, initialMs: 250 })).toBe(250);
    expect(backoffDelay(2, { jitter: false, initialMs: 250 })).toBe(1000);
  });

  it('clamps negative retry numbers to 0', () => {
    expect(backoffDelay(-5, { jitter: false })).toBe(1000);
  });

  it('applies 0.5x..1.5x jitter by default (still within bounds)', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    // base 2000 * (0.5 + 0.5) = 2000
    expect(backoffDelay(1)).toBe(2000);
    spy.mockReturnValue(0); // multiplier 0.5 -> 1000
    expect(backoffDelay(1)).toBe(1000);
    spy.mockReturnValue(0.999999); // multiplier ~1.5 -> ~3000
    expect(backoffDelay(1)).toBeGreaterThan(2900);
    spy.mockRestore();
  });

  it('defaults to initialMs=1000 / maxMs=60000 when options omitted', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(backoffDelay(0)).toBe(1000);
    spy.mockRestore();
  });
});
