/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, waitFor, screen, fireEvent } from '@testing-library/react';
import { act } from 'react';
import { App } from '../../src/renderer/App';
import type { Site, Tree, TreeChange } from '../../src/shared/types';

const TREE: Tree = [{ kind: 'network', address: '254', label: null, applications: [], units: [] }];
const homeSite: Site = { id: 'a', name: 'Home', host: '10.0.0.1', commandPort: 20023, eventPort: 20025 };

function installFakeCgate() {
  let treeChangedCb: ((c: TreeChange) => void) | null = null;
  let statusCb: ((s: string) => void) | null = null;
  const getTree = jest.fn().mockResolvedValue(TREE);
  (window as any).cgate = {
    connect: jest.fn().mockImplementation(async () => { statusCb?.('connected'); }),
    disconnect: jest.fn().mockResolvedValue(undefined),
    getTree,
    getServerStatus: jest.fn().mockResolvedValue(null),
    sites: {
      list: jest.fn().mockResolvedValue([homeSite]),
      getImportedLabels: jest.fn().mockResolvedValue(null),
      saveImportedLabels: jest.fn(),
      add: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    },
    onStatus: (cb: (s: string) => void) => { statusCb = cb; return () => {}; },
    onState: () => () => {},
    onTrigger: () => () => {},
    onMeasurement: () => () => {},
    onTreeChanged: (cb: (c: TreeChange) => void) => { treeChangedCb = cb; return () => {}; },
    project: {
      name: jest.fn().mockResolvedValue('TESTPROJ'),
      dir: jest.fn().mockResolvedValue([{ name: 'TESTPROJ', state: null }]),
      list: jest.fn().mockResolvedValue([{ name: 'TESTPROJ', state: 'started' }]),
      load: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
      start: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
      use: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
      save: jest.fn(),
      import: jest.fn(),
      export: jest.fn(),
    },
    net: {
      list: jest.fn().mockResolvedValue([{ address: '254', state: 'ok' }]),
    },
    nodes: {
      getGroupDetail: jest.fn().mockResolvedValue({ label: null, level: null }),
      getNetworkLevels: jest.fn().mockResolvedValue({}),
    },
    control: {},
    labels: {},
  };
  return { getTree, fire: (c: TreeChange) => treeChangedCb && treeChangedCb(c) };
}

describe('App 742 reconcile', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('re-fetches the active network tree (debounced) on a treeChanged event', async () => {
    const { getTree, fire } = installFakeCgate();
    render(<App />);
    await screen.findByText('Home');
    await act(async () => {
      fireEvent.click(screen.getByText('Connect'));
    });
    await waitFor(() => expect(getTree).toHaveBeenCalledWith('254'));
    getTree.mockClear();
    act(() => { fire({ network: '254', raw: '742 ...' }); fire({ network: '254', raw: '742 ...' }); });
    act(() => { jest.advanceTimersByTime(600); });
    await waitFor(() => expect(getTree).toHaveBeenCalledTimes(1));
    expect(getTree).toHaveBeenCalledWith('254');
  });
});
