/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { App } from '../../src/renderer/App';
import type { Tree } from '../../src/shared/types';

const sampleTree: Tree = [
  {
    kind: 'network',
    address: '254',
    label: null,
    applications: [
      {
        kind: 'application',
        address: '56',
        label: null,
        groups: [
          {
            kind: 'group',
            address: '254/56/4',
            network: '254',
            application: '56',
            group: '4',
            label: 'Kitchen',
          },
        ],
      },
    ],
  },
];

function installApi() {
  let statusCb: (s: any) => void = () => {};
  let stateCb: (s: any) => void = () => {};
  const api = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    getTree: jest.fn().mockResolvedValue(sampleTree),
    onStatus: jest.fn((cb: any) => { statusCb = cb; return jest.fn(); }),
    onState: jest.fn((cb: any) => { stateCb = cb; return jest.fn(); }),
  };
  (window as any).cgate = api;
  return { api, fireStatus: (s: any) => statusCb(s), fireState: (s: any) => stateCb(s) };
}

describe('App', () => {
  it('renders the initial disconnected status and subscribes to updates', () => {
    const { api, fireStatus } = installApi();
    render(<App />);
    expect(screen.getByText('disconnected')).toBeInTheDocument();
    expect(api.onStatus).toHaveBeenCalled();
    expect(api.onState).toHaveBeenCalled();
    act(() => fireStatus('connected'));
    expect(screen.getByText('connected')).toBeInTheDocument();
  });

  it('connects, loads the tree, and reflects live state', async () => {
    const { api, fireState } = installApi();
    render(<App />);

    await act(async () => {
      fireEvent.click(screen.getByText('Connect'));
    });

    expect(api.connect).toHaveBeenCalledWith({
      host: '127.0.0.1',
      commandPort: 20023,
      eventPort: 20025,
    });
    expect(api.getTree).toHaveBeenCalledWith('254');
    expect(await screen.findByText(/Kitchen/)).toBeInTheDocument();

    act(() => fireState({ address: '254/56/4', level: 255, on: true }));
    expect(screen.getByText('ON 100%')).toBeInTheDocument();
  });

  it('unsubscribes from bridge events on unmount', () => {
    const offStatus = jest.fn();
    const offState = jest.fn();
    (window as any).cgate = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      getTree: jest.fn().mockResolvedValue([]),
      onStatus: jest.fn(() => offStatus),
      onState: jest.fn(() => offState),
    };
    const { unmount } = render(<App />);
    unmount();
    expect(offStatus).toHaveBeenCalled();
    expect(offState).toHaveBeenCalled();
  });
});
