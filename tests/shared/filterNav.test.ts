import { nextFilterIndex } from '../../src/shared/filterNav';

describe('nextFilterIndex', () => {
  it('moves within bounds and seeds from empty selection', () => {
    expect(nextFilterIndex(0, -1, 'down')).toBe(-1);
    expect(nextFilterIndex(3, -1, 'down')).toBe(0);
    expect(nextFilterIndex(3, -1, 'up')).toBe(2);
    expect(nextFilterIndex(3, 0, 'down')).toBe(1);
    expect(nextFilterIndex(3, 2, 'down')).toBe(2);
    expect(nextFilterIndex(3, 1, 'up')).toBe(0);
    expect(nextFilterIndex(3, 0, 'up')).toBe(0);
  });
});
