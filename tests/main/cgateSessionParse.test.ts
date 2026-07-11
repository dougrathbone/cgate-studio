import { parseNetworkLines } from '../../src/main/cgateSessionParse';

describe('parseNetworkLines', () => {
  it('parses a single NET LIST line with health fields', () => {
    expect(
      parseNetworkLines(['131 network=254 State=ok InterfaceState=running SyncState=idle']),
    ).toEqual([
      {
        address: '254',
        state: 'ok',
        interfaceState: 'running',
        syncState: 'idle',
      },
    ]);
  });

  it('parses multiple networks and ignores unrelated lines', () => {
    expect(
      parseNetworkLines([
        '131-network=254 State=ok InterfaceState=running',
        '131 network=253 State=new InterfaceState=closed',
        '200 OK.',
      ]),
    ).toEqual([
      { address: '254', state: 'ok', interfaceState: 'running', syncState: null },
      { address: '253', state: 'new', interfaceState: 'closed', syncState: null },
    ]);
  });

  it('returns empty when no network= tokens', () => {
    expect(parseNetworkLines(['200 OK.', '124 no projects found'])).toEqual([]);
  });
});
