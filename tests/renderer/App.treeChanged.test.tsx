/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { act } from 'react';
import { App } from '../../src/renderer/App';
import type { Tree, TreeChange } from '../../src/shared/types';

const TREE: Tree = [{ kind: 'network', address: '254', label: null, applications: [], units: [] }];

function installFakeCgate() {
  let treeChangedCb: ((c: TreeChange) => void) | null = null;
  const getTree = jest.fn().mockResolvedValue(TREE);
  (window as any).cgate = {
    sites: { list: jest.fn().mockResolvedValue([]), getImportedLabels: jest.fn().mockResolvedValue(null) },
    onStatus: () => () => {}, onState: () => () => {}, onTrigger: () => () => {}, onMeasurement: () => () => {},
    onTreeChanged: (cb: (c: TreeChange) => void) => { treeChangedCb = cb; return () => {}; },
    getTree, project: { name: jest.fn().mockResolvedValue('TESTPROJ') },
  };
  return { getTree, fire: (c: TreeChange) => treeChangedCb && treeChangedCb(c) };
}

describe('App 742 reconcile', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('re-fetches the network tree (debounced) on a treeChanged event', async () => {
    const { getTree, fire } = installFakeCgate();
    render(<App />);
    getTree.mockClear();
    act(() => { fire({ network: '254', raw: '742 ...' }); fire({ network: '254', raw: '742 ...' }); });
    act(() => { jest.advanceTimersByTime(600); });
    await waitFor(() => expect(getTree).toHaveBeenCalledTimes(1));
  });
});
