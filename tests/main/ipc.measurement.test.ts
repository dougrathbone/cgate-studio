import { CHANNELS } from '../../src/main/ipc';

describe('M5 IPC channels', () => {
  it('declares the measurement push channel', () => {
    expect(CHANNELS.measurement).toBe('cgate:measurement');
  });
});
