import { CHANNELS } from '../../src/main/ipc';

describe('M4 IPC channels', () => {
  it('declares fireScene, trigger and treeChanged channels', () => {
    expect(CHANNELS.fireScene).toBe('control:fireScene');
    expect(CHANNELS.trigger).toBe('cgate:trigger');
    expect(CHANNELS.treeChanged).toBe('cgate:treeChanged');
  });
});
