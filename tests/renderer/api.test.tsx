/**
 * @jest-environment jsdom
 */
import { cgate } from '../../src/renderer/api';

describe('renderer api', () => {
  it('returns the cgate bridge exposed on window', () => {
    const fake = { connect: jest.fn() } as any;
    (window as any).cgate = fake;
    expect(cgate()).toBe(fake);
  });
});
