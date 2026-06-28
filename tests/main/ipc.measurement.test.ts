// Mock electron so importing ipc.ts (which imports 'electron') never resolves the
// real electron binary — keeps this unit test hermetic and immune to CI runners
// where the electron binary isn't installed.
jest.mock('electron', () => ({
  ipcMain: { handle: jest.fn() },
  dialog: { showOpenDialog: jest.fn(), showSaveDialog: jest.fn() },
  BrowserWindow: class {},
}));

import { CHANNELS } from '../../src/main/ipc';

describe('M5 IPC channels', () => {
  it('declares the measurement push channel', () => {
    expect(CHANNELS.measurement).toBe('cgate:measurement');
  });
});
