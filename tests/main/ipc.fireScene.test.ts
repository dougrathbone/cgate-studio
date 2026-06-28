// Mock electron so importing ipc.ts (which imports 'electron') never resolves the
// real electron binary — keeps this unit test hermetic and immune to CI runners
// where the electron binary isn't installed.
jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn() },
  dialog: { showOpenDialog: jest.fn(), showSaveDialog: jest.fn() },
  BrowserWindow: class {},
}));

import { CHANNELS } from '../../src/main/ipc';

describe('M4 IPC channels', () => {
  it('declares fireScene, trigger and treeChanged channels', () => {
    expect(CHANNELS.fireScene).toBe('control:fireScene');
    expect(CHANNELS.trigger).toBe('cgate:trigger');
    expect(CHANNELS.treeChanged).toBe('cgate:treeChanged');
  });
});
