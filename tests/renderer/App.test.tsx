/**
 * @jest-environment jsdom
 */
import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { App } from '../../src/renderer/App';
import type { Site, Tree, LabelImport } from '../../src/shared/types';

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
  let triggerCb: (s: any) => void = () => {};
  let updateCb: (s: any) => void = () => {};
  let persistedGlobal: LabelImport | null = null;
  const persistedBySite: Record<string, LabelImport> = {};
  const api = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    getTree: jest.fn().mockResolvedValue(sampleTree),
    getServerStatus: jest.fn().mockResolvedValue({
      connection: 'connected',
      host: '10.0.0.1',
      commandPort: 20023,
      eventPort: 20025,
      commandConnected: true,
      eventConnected: true,
      serverVersion: 'v2.8.0',
      serverGreeting: null,
      activeProject: { name: 'TESTPROJ', state: 'started' },
      loadedProjects: [],
      projectsOnDisk: [],
    }),
    onStatus: jest.fn((cb: any) => { statusCb = cb; return jest.fn(); }),
    onState: jest.fn((cb: any) => { stateCb = cb; return jest.fn(); }),
    onTrigger: jest.fn((cb: any) => { triggerCb = cb; return jest.fn(); }),
    onMeasurement: jest.fn((cb: any) => { return jest.fn(); }),
    onTreeChanged: jest.fn(() => jest.fn()),
    onActivity: jest.fn(() => jest.fn()),
    onUpdate: jest.fn((cb: any) => { updateCb = cb; return jest.fn(); }),
    sites: {
      list: jest.fn().mockResolvedValue(initialSites),
      add: jest.fn(),
      update: jest.fn(),
      remove: jest.fn().mockResolvedValue([]),
      getImportedLabels: jest.fn(async (siteId: string | null) => {
        if (siteId && persistedBySite[siteId]) return persistedBySite[siteId];
        return persistedGlobal;
      }),
      saveImportedLabels: jest.fn(async (siteId: string | null, labels: LabelImport) => {
        if (siteId) persistedBySite[siteId] = labels;
        else persistedGlobal = labels;
      }),
    },
    control: {
      setLevel: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
      terminateRamp: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
      fireScene: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
    },
    labels: {
      rename: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
      clear: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
    },
    project: {
      save: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
      name: jest.fn().mockResolvedValue('TESTPROJ'),
      dir: jest.fn().mockResolvedValue([{ name: 'TESTPROJ', state: null }]),
      list: jest.fn().mockResolvedValue([{ name: 'TESTPROJ', state: 'started' }]),
      load: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
      start: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
      use: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
      import: jest.fn().mockResolvedValue(null),
      export: jest.fn().mockResolvedValue(null),
    },
    net: {
      list: jest.fn().mockResolvedValue([
        { address: '254', state: 'ok', interfaceState: 'running', syncState: 'idle' },
      ]),
      open: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
      close: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
      sync: jest.fn().mockResolvedValue({ code: 202, text: 'Done.', lines: [] }),
      health: jest.fn().mockResolvedValue({
        address: '254', state: 'ok', interfaceState: 'running', syncState: 'idle',
      }),
    },
    activity: { list: jest.fn().mockResolvedValue([]) },
    updates: {
      check: jest.fn().mockResolvedValue(undefined),
      quitAndInstall: jest.fn().mockResolvedValue(undefined),
    },
    nodes: {
      getGroupDetail: jest.fn().mockResolvedValue({ label: null, level: null }),
      getNetworkLevels: jest.fn().mockResolvedValue({}),
      getGroupParams: jest.fn().mockResolvedValue({
        Name: 'Kitchen',
        Level: '128',
        RampTime: '4',
        Type: 'light',
      }),
      getUnitParams: jest.fn().mockResolvedValue({ Name: 'DIMMER' }),
      setGroupParam: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
      setUnitName: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
      identifyUnit: jest.fn().mockResolvedValue({ code: 200, text: 'OK.', lines: [] }),
    },
  };
  (window as any).cgate = api;
  return { api, fireStatus: (s: any) => statusCb(s), fireState: (s: any) => stateCb(s), fireTrigger: (s: any) => triggerCb(s), fireUpdate: (s: any) => updateCb(s) };
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
    // Status renders as a colored dot whose accessible label / tooltip is the status.
    const dot = screen.getByRole('button', { name: /C-Gate status: connected/i });
    expect(dot).toBeInTheDocument();
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

  it('operates a group (switch on) when connected', async () => {
    const { api, fireStatus } = installApi();
    render(<App />);
    await screen.findByText('Home');
    await act(async () => { fireEvent.click(screen.getByText('Connect')); });
    act(() => fireStatus('connected'));
    // Controls only appear when connected.
    fireEvent.click(await screen.findByLabelText('Turn on 254/56/4'));
    expect(api.control.setLevel).toHaveBeenCalledWith(
      { network: '254', application: '56', group: '4' }, 255, undefined,
    );
  });

  it('renames a group, shows the unsaved banner, and saves on confirmation', async () => {
    const { api, fireStatus } = installApi();
    render(<App />);
    await screen.findByText('Home');
    await act(async () => { fireEvent.click(screen.getByText('Connect')); });
    act(() => fireStatus('connected'));

    fireEvent.click(await screen.findByLabelText('Edit label 254/56/4'));
    const input = screen.getByLabelText('Rename 254/56/4');
    fireEvent.change(input, { target: { value: 'Lounge' } });
    await act(async () => { fireEvent.keyDown(input, { key: 'Enter' }); });

    expect(api.labels.rename).toHaveBeenCalledWith(
      { network: '254', application: '56', group: '4' }, 'Lounge',
    );
    // The unsaved-changes banner appears; saving requires explicit confirmation.
    expect(await screen.findByText(/1 unsaved project change/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Save to project'));
    await act(async () => { fireEvent.click(screen.getByText('Confirm save')); });
    expect(api.project.save).toHaveBeenCalled();
    expect(screen.queryByText(/unsaved project change/)).not.toBeInTheDocument();
  });

  it('imports project labels and overlays them on the connected tree', async () => {
    const { api } = installApi();
    (api.project.import as jest.Mock).mockResolvedValue({
      source: 'home.cbz',
      networks: {},
      applications: {},
      groups: { '254/56/4': 'Master Bedroom' },
      stats: { networkCount: 1, groupCount: 1, labelCount: 1 },
    });
    render(<App />);
    await screen.findByText('Home');
    await act(async () => { fireEvent.click(screen.getByText('Connect')); });
    // Live tree shows the C-Gate label first.
    expect(await screen.findByText('Kitchen')).toBeInTheDocument();

    await act(async () => { fireEvent.click(screen.getByText('Import labels')); });

    expect(api.project.import).toHaveBeenCalled();
    expect(api.sites.saveImportedLabels).toHaveBeenCalledWith('a', expect.objectContaining({
      groups: { '254/56/4': 'Master Bedroom' },
    }));
    // Imported label overrides the live one, and a notice is shown.
    expect(await screen.findByText('Master Bedroom')).toBeInTheDocument();
    expect(screen.queryByText('Kitchen')).not.toBeInTheDocument();
    expect(screen.getByText(/Imported 1 label from home\.cbz/)).toBeInTheDocument();
    expect(screen.getByText(/saved for this site/)).toBeInTheDocument();
  });

  it('enriches groups with labels and levels fetched after the initial load', async () => {
    const unlabelled: Tree = [
      {
        kind: 'network', address: '254', label: null,
        applications: [
          {
            kind: 'application', address: '56', label: null,
            groups: [
              { kind: 'group', address: '254/56/4', network: '254', application: '56', group: '4', label: null },
            ],
          },
        ],
        units: [],
      },
    ];
    const { api } = installApi();
    (api.getTree as jest.Mock).mockResolvedValue(unlabelled);
    (api.nodes.getGroupDetail as jest.Mock).mockResolvedValue({ label: 'Pantry', level: 255 });

    render(<App />);
    await screen.findByText('Home');
    await act(async () => { fireEvent.click(screen.getByText('Connect')); });

    expect(api.nodes.getGroupDetail).toHaveBeenCalledWith({ network: '254', application: '56', group: '4' });
    // The fetched tag name fills in the previously unlabelled group...
    expect(await screen.findByText('Pantry')).toBeInTheDocument();
    // ...and the fetched level seeds the live state badge.
    expect(await screen.findByText('ON 100%')).toBeInTheDocument();
  });

  it('keeps an imported label over one fetched during enrichment', async () => {
    const unlabelled: Tree = [
      {
        kind: 'network', address: '254', label: null,
        applications: [
          {
            kind: 'application', address: '56', label: null,
            groups: [
              { kind: 'group', address: '254/56/4', network: '254', application: '56', group: '4', label: null },
            ],
          },
        ],
        units: [],
      },
    ];
    const { api } = installApi();
    (api.getTree as jest.Mock).mockResolvedValue(unlabelled);
    (api.project.import as jest.Mock).mockResolvedValue({
      source: 'home.cbz', networks: {}, applications: {},
      groups: { '254/56/4': 'Imported Name' },
      stats: { networkCount: 1, groupCount: 1, labelCount: 1 },
    });
    // Enrichment would otherwise label it "Live Tag".
    let release: (v: unknown) => void = () => {};
    (api.nodes.getGroupDetail as jest.Mock).mockReturnValue(
      new Promise((res) => { release = res; }),
    );

    render(<App />);
    await screen.findByText('Home');
    await act(async () => { fireEvent.click(screen.getByText('Import labels')); });
    await act(async () => { fireEvent.click(screen.getByText('Connect')); });
    expect(await screen.findByText('Imported Name')).toBeInTheDocument();

    // Now let enrichment resolve: the imported label must win.
    await act(async () => { release({ label: 'Live Tag', level: null }); });
    expect(screen.getByText('Imported Name')).toBeInTheDocument();
    expect(screen.queryByText('Live Tag')).not.toBeInTheDocument();
  });

  it('loads persisted labels when connecting to a site', async () => {
    const { api } = installApi();
    (api.sites.getImportedLabels as jest.Mock).mockResolvedValue({
      source: 'saved.cbz',
      networks: {},
      applications: {},
      groups: { '254/56/4': 'Saved Label' },
      stats: { networkCount: 1, groupCount: 1, labelCount: 1 },
    });
    render(<App />);
    await screen.findByText('Home');
    await act(async () => { fireEvent.click(screen.getByText('Connect')); });
    expect(api.sites.getImportedLabels).toHaveBeenCalledWith('a');
    expect(await screen.findByText('Saved Label')).toBeInTheDocument();
  });

  it('does nothing when the import picker is cancelled', async () => {
    const { api } = installApi();
    (api.project.import as jest.Mock).mockResolvedValue(null);
    render(<App />);
    await screen.findByText('Home');
    await act(async () => { fireEvent.click(screen.getByText('Import labels')); });
    expect(api.project.import).toHaveBeenCalled();
    expect(screen.queryByText(/Imported/)).not.toBeInTheDocument();
  });

  it('disables Export labels until a tree is loaded', async () => {
    render(<App />);
    await screen.findByText('Home');
    expect(screen.getByText('Export labels')).toBeDisabled();
  });

  it('exports the current tree and shows a notice', async () => {
    const { api } = installApi();
    (api.project.export as jest.Mock).mockResolvedValue({
      path: '/tmp/TESTPROJ.xml',
      stats: { networkCount: 1, groupCount: 1, labelCount: 1, unitCount: 0 },
    });
    render(<App />);
    await screen.findByText('Home');
    await act(async () => { fireEvent.click(screen.getByText('Connect')); });
    expect(await screen.findByText('Kitchen')).toBeInTheDocument();

    await act(async () => { fireEvent.click(screen.getByText('Export labels')); });

    expect(api.project.export).toHaveBeenCalledWith(
      expect.objectContaining({
        projectName: 'TESTPROJ',
        tree: expect.arrayContaining([
          expect.objectContaining({ address: '254' }),
        ]),
      }),
    );
    expect(screen.getByText(/Exported 1 group label/)).toBeInTheDocument();
    expect(screen.getByText(/TESTPROJ\.xml/)).toBeInTheDocument();
  });

  it('does nothing when the export save dialog is cancelled', async () => {
    const { api } = installApi();
    (api.project.export as jest.Mock).mockResolvedValue(null);
    render(<App />);
    await screen.findByText('Home');
    await act(async () => { fireEvent.click(screen.getByText('Connect')); });
    await act(async () => { fireEvent.click(screen.getByText('Export labels')); });
    expect(api.project.export).toHaveBeenCalled();
    expect(screen.queryByText(/Exported/)).not.toBeInTheDocument();
  });

  it('closes the entity panel when Escape is pressed', async () => {
    const { fireStatus } = installApi();
    render(<App />);
    await screen.findByText('Home');
    await act(async () => { fireEvent.click(screen.getByText('Connect')); });
    await act(async () => { fireStatus('connected'); });
    const groupRows = screen.getAllByRole('button').filter((el) => el.textContent?.includes('254/56/4'));
    await act(async () => { fireEvent.click(groupRows[0]); });
    expect(await screen.findByRole('complementary', { name: 'Entity details' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('complementary', { name: 'Entity details' })).not.toBeInTheDocument();
  });

  it('opens the entity panel when a group row is selected', async () => {
    const { api, fireStatus } = installApi();
    render(<App />);
    await screen.findByText('Home');
    await act(async () => { fireEvent.click(screen.getByText('Connect')); });
    await act(async () => { fireStatus('connected'); });
    const groupRows = screen.getAllByRole('button').filter((el) => el.textContent?.includes('254/56/4'));
    expect(groupRows.length).toBeGreaterThan(0);
    await act(async () => { fireEvent.click(groupRows[0]); });
    expect(api.nodes.getGroupParams).toHaveBeenCalled();
    expect(await screen.findByRole('complementary', { name: 'Entity details' })).toBeInTheDocument();
    expect(await screen.findByText('Group 254/56/4')).toBeInTheDocument();
  });

  it('opens the C-Gate status panel and queries the server', async () => {
    const { api, fireStatus } = installApi();
    render(<App />);
    await screen.findByText('Home');
    await act(async () => { fireEvent.click(screen.getByText('Connect')); });
    await act(async () => { fireStatus('connected'); });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /C-Gate status/i }));
    });
    expect(api.getServerStatus).toHaveBeenCalled();
    expect(await screen.findByRole('dialog', { name: 'C-Gate server status' })).toBeInTheDocument();
    expect(await screen.findByText('v2.8.0')).toBeInTheDocument();
    expect(screen.getAllByText('TESTPROJ').length).toBeGreaterThanOrEqual(1);
  });

  it('unsubscribes from bridge events on unmount', () => {
    const offStatus = jest.fn();
    const offState = jest.fn();
    const offTrigger = jest.fn();
    const offMeasurement = jest.fn();
    const offTreeChanged = jest.fn();
    const offActivity = jest.fn();
    const offUpdate = jest.fn();
    (window as any).cgate = {
      connect: jest.fn(),
      disconnect: jest.fn(),
      getTree: jest.fn().mockResolvedValue([]),
      getServerStatus: jest.fn().mockResolvedValue(null),
      onStatus: jest.fn(() => offStatus),
      onState: jest.fn(() => offState),
      onTrigger: jest.fn(() => offTrigger),
      onMeasurement: jest.fn(() => offMeasurement),
      onTreeChanged: jest.fn(() => offTreeChanged),
      onActivity: jest.fn(() => offActivity),
      onUpdate: jest.fn(() => offUpdate),
      project: {
        name: jest.fn().mockResolvedValue('TESTPROJ'),
        dir: jest.fn().mockResolvedValue([]),
        list: jest.fn().mockResolvedValue([]),
        load: jest.fn(),
        start: jest.fn(),
        use: jest.fn(),
      },
      net: {
        list: jest.fn().mockResolvedValue([]),
        health: jest.fn().mockResolvedValue({ address: '254' }),
      },
      activity: { list: jest.fn().mockResolvedValue([]) },
      sites: {
        list: jest.fn().mockResolvedValue([]),
        add: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
        getImportedLabels: jest.fn().mockResolvedValue(null),
        saveImportedLabels: jest.fn().mockResolvedValue(undefined),
      },
    };
    const { unmount } = render(<App />);
    unmount();
    expect(offStatus).toHaveBeenCalled();
    expect(offState).toHaveBeenCalled();
    expect(offTrigger).toHaveBeenCalled();
    expect(offMeasurement).toHaveBeenCalled();
    expect(offTreeChanged).toHaveBeenCalled();
    expect(offActivity).toHaveBeenCalled();
    expect(offUpdate).toHaveBeenCalled();
  });

  it('switches to Commission views, opens status, and shows last-fired trigger', async () => {
    const { fireStatus, fireTrigger } = installApi();
    render(<App />);
    await screen.findByText('Home');
    await act(async () => { fireEvent.click(screen.getByText('Connect')); });
    act(() => fireStatus('connected'));
    fireEvent.click(screen.getByRole('button', { name: /C-Gate status/ }));
    fireEvent.click(screen.getByRole('tab', { name: 'Commission' }));
    expect(await screen.findByRole('tab', { name: 'Groups' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Inventory' }));
    expect(screen.getByRole('tab', { name: 'Inventory' })).toHaveAttribute('aria-selected', 'true');
    act(() => fireTrigger({
      address: '254/202/1',
      network: '254',
      application: '202',
      group: '1',
      actionSelector: 4,
    }));
    expect(await screen.findByText(/Fired 254\/202\/1/)).toBeInTheDocument();
  });

  it('shows a restart banner when an update is ready', async () => {
    const { api, fireUpdate } = installApi();
    render(<App />);
    await screen.findByText('Home');
    act(() => fireUpdate({ state: 'ready', version: '1.4.0' }));
    expect(await screen.findByText(/1\.4\.0 is ready to install/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Restart to update/i }));
    expect(api.updates.quitAndInstall).toHaveBeenCalled();
  });
});
