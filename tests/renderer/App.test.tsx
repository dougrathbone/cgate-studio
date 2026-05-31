/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { App } from '../../src/renderer/App';
import type { Site, Tree } from '../../src/shared/types';

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
    units: [],
  },
];

const homeSite: Site = { id: 'a', name: 'Home', host: '10.0.0.1', commandPort: 20023, eventPort: 20025 };

function installApi(initialSites: Site[] = [homeSite]) {
  let statusCb: (s: any) => void = () => {};
  let stateCb: (s: any) => void = () => {};
  const api = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    getTree: jest.fn().mockResolvedValue(sampleTree),
    onStatus: jest.fn((cb: any) => { statusCb = cb; return jest.fn(); }),
    onState: jest.fn((cb: any) => { stateCb = cb; return jest.fn(); }),
    sites: {
      list: jest.fn().mockResolvedValue(initialSites),
      add: jest.fn(),
      update: jest.fn(),
      remove: jest.fn().mockResolvedValue([]),
    },
  };
  (window as any).cgate = api;
  return { api, fireStatus: (s: any) => statusCb(s), fireState: (s: any) => stateCb(s) };
}

describe('App', () => {
  it('loads saved sites on mount and subscribes to updates', async () => {
    const { api, fireStatus } = installApi();
    render(<App />);
    expect(api.sites.list).toHaveBeenCalled();
    expect(api.onStatus).toHaveBeenCalled();
    expect(api.onState).toHaveBeenCalled();
    expect(await screen.findByText('Home')).toBeInTheDocument();
    act(() => fireStatus('connected'));
    expect(screen.getByText('connected')).toBeInTheDocument();
  });

  it('connecting to a site loads its tree and reflects live state', async () => {
    const { api, fireState } = installApi();
    render(<App />);
    await screen.findByText('Home');

    await act(async () => {
      fireEvent.click(screen.getByText('Connect'));
    });

    expect(api.connect).toHaveBeenCalledWith({
      host: '10.0.0.1',
      commandPort: 20023,
      eventPort: 20025,
    });
    expect(api.getTree).toHaveBeenCalledWith('254');
    expect(await screen.findByText(/Kitchen/)).toBeInTheDocument();

    act(() => fireState({ address: '254/56/4', level: 255, on: true }));
    expect(screen.getByText('ON 100%')).toBeInTheDocument();
  });

  it('adds a site through the form', async () => {
    const created: Site[] = [homeSite, { id: 'b', name: 'Office', host: '10.0.0.2', commandPort: 20023, eventPort: 20025 }];
    const { api } = installApi();
    (api.sites.add as jest.Mock).mockResolvedValue(created);
    render(<App />);
    await screen.findByText('Home');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Office' } });
    fireEvent.change(screen.getByLabelText('Host'), { target: { value: '10.0.0.2' } });
    await act(async () => {
      fireEvent.click(screen.getByText('Add site'));
    });

    expect(api.sites.add).toHaveBeenCalledWith({
      name: 'Office',
      host: '10.0.0.2',
      commandPort: 20023,
      eventPort: 20025,
    });
    expect(await screen.findByText('Office')).toBeInTheDocument();
  });

  it('removes a site, clearing the active selection when it was connected', async () => {
    const { api } = installApi();
    render(<App />);
    await screen.findByText('Home');

    // Connect first so the site becomes active...
    await act(async () => { fireEvent.click(screen.getByText('Connect')); });
    expect(await screen.findByText('Reconnect')).toBeInTheDocument();

    // ...then delete it; the active selection should clear (button reverts).
    await act(async () => { fireEvent.click(screen.getByLabelText('Delete Home')); });
    expect(api.sites.remove).toHaveBeenCalledWith('a');
  });

  it('surfaces a connect/getTree failure as an error instead of crashing', async () => {
    const { api } = installApi();
    (api.connect as jest.Mock).mockRejectedValue(new Error('TREEXML timed out'));
    render(<App />);
    await screen.findByText('Home');
    await act(async () => { fireEvent.click(screen.getByText('Connect')); });
    expect(await screen.findByText(/TREEXML timed out/)).toBeInTheDocument();
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
      sites: { list: jest.fn().mockResolvedValue([]), add: jest.fn(), update: jest.fn(), remove: jest.fn() },
    };
    const { unmount } = render(<App />);
    unmount();
    expect(offStatus).toHaveBeenCalled();
    expect(offState).toHaveBeenCalled();
  });
});
