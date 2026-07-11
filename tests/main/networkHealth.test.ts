import { networkNeedsForce } from '../../src/shared/types';
import { parseNetworkHealthFromGet } from '../../src/main/cgateSessionParse';

describe('networkNeedsForce', () => {
  it('is true when State=new', () => {
    expect(networkNeedsForce({ state: 'new', syncState: 'idle' })).toBe(true);
  });

  it('is true when SyncState is mid-sync', () => {
    expect(networkNeedsForce({ state: 'ok', syncState: 'syncing' })).toBe(true);
  });

  it('is false when healthy', () => {
    expect(networkNeedsForce({ state: 'ok', syncState: 'idle' })).toBe(false);
    expect(networkNeedsForce(null)).toBe(false);
  });
});

describe('parseNetworkHealthFromGet', () => {
  it('parses GET State lines', () => {
    expect(parseNetworkHealthFromGet('254', ['300 //P/254: State=ok'])).toEqual({
      address: '254',
      state: 'ok',
      interfaceState: null,
      syncState: null,
    });
  });
});
