import { tagNameMismatch } from '../../src/shared/mismatch';

describe('mismatch helpers (M14)', () => {
  it('is true only when both sides are non-empty and differ', () => {
    expect(tagNameMismatch('Kitchen', 'Kitchen Light')).toBe(true);
    expect(tagNameMismatch('Kitchen', 'Kitchen')).toBe(false);
    expect(tagNameMismatch('', 'Kitchen')).toBe(false);
    expect(tagNameMismatch('Kitchen', '')).toBe(false);
    expect(tagNameMismatch(null, 'Kitchen')).toBe(false);
    expect(tagNameMismatch('  a  ', 'a')).toBe(false);
  });
});
