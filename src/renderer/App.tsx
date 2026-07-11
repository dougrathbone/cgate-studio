import React, { useEffect, useRef, useState } from 'react';
import { cgate } from './api';
import { SiteForm } from './components/SiteForm';
import { SiteList } from './components/SiteList';
import { DeviceTree } from './components/DeviceTree';
import { CgateStatusPanel } from './components/CgateStatusPanel';
import { EntityPanel } from './components/EntityPanel';
import { SessionBar } from './components/SessionBar';
import { StatusBar } from './components/StatusBar';
import { ActivityDrawer } from './components/ActivityDrawer';
import { ModeToggle } from './components/ModeToggle';
import { InventoryTable } from './components/InventoryTable';
import { GroupsWorkspace } from './components/GroupsWorkspace';
import type { GroupActions } from './components/GroupRow';
import type {
  ConnectionStatus,
  Tree,
  GroupState,
  GroupNode,
  Site,
  SiteInput,
  LabelImport,
  TreeSelection,
  TriggerActivity,
  MeasurementState,
  CgateNetworkInfo,
  ActivityEntry,
  UiMode,
} from '../shared/types';
import { CONNECTION_SUPERSEDED } from '../shared/types';
import type { CgateServerStatus, CgateProjectInfo } from '../shared/cgateStatus';

const refOf = (g: GroupNode) => ({ network: g.network, application: g.application, group: g.group });
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Colour of the header status dot, keyed by connection status. Uses the design
// tokens so it tracks the active (dark/light) theme.
const STATUS_COLORS: Record<ConnectionStatus, string> = {
  connected: 'var(--on)',
  connecting: 'var(--warn)',
  reconnecting: 'var(--warn)',
  disconnected: 'var(--off)',
  error: 'var(--danger)',
};

// Return a new tree with the label of the group at `address` replaced.
function relabel(tree: Tree, address: string, label: string | null): Tree {
  return tree.map((net) => ({
    ...net,
    applications: net.applications.map((app) => ({
      ...app,
      groups: app.groups.map((g) => (g.address === address ? { ...g, label } : g)),
    })),
  }));
}

// Flatten every group in the tree (used to drive node-by-node enrichment).
function collectGroups(tree: Tree): GroupNode[] {
  const out: GroupNode[] = [];
  for (const net of tree)
    for (const app of net.applications)
      for (const g of app.groups) out.push(g);
  return out;
}

// Set a single group's label only when it actually changes, so streaming
// enrichment results don't churn the whole tree on every resolved node.
function setGroupLabel(tree: Tree, address: string, label: string): Tree {
  let changed = false;
  const next = tree.map((net) => ({
    ...net,
    applications: net.applications.map((app) => ({
      ...app,
      groups: app.groups.map((g) => {
        if (g.address === address && g.label !== label) {
          changed = true;
          return { ...g, label };
        }
        return g;
      }),
    })),
  }));
  return changed ? next : tree;
}

// Overlay imported project labels onto the tree at every level. Imported names
// win when present; otherwise the live/existing label is kept. Display-only.
function applyImportedLabels(tree: Tree, imp: LabelImport): Tree {
  return tree.map((net) => ({
    ...net,
    label: imp.networks[net.address] ?? net.label,
    applications: net.applications.map((app) => ({
      ...app,
      label: imp.applications[`${net.address}/${app.address}`] ?? app.label,
      groups: app.groups.map((g) => ({ ...g, label: imp.groups[g.address] ?? g.label })),
    })),
  }));
}

function mergeProjects(
  onDisk: CgateProjectInfo[],
  loaded: CgateProjectInfo[],
): CgateProjectInfo[] {
  const byName = new Map<string, CgateProjectInfo>();
  for (const p of onDisk) byName.set(p.name, { name: p.name, state: p.state ?? null });
  for (const p of loaded) byName.set(p.name, { name: p.name, state: p.state ?? null });
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function pickNetwork(nets: CgateNetworkInfo[], preferred: string | null): string | null {
  if (preferred && nets.some((n) => n.address === preferred)) return preferred;
  return nets[0]?.address ?? null;
}

export function App() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [tree, setTree] = useState<Tree>([]);
  const [states, setStates] = useState<Record<string, GroupState>>({});
  const [measurements, setMeasurements] = useState<Record<string, MeasurementState>>({});
  const [sites, setSites] = useState<Site[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // The active C-Gate project name, shown next to the network to identify it.
  const [projectName, setProjectName] = useState<string | null>(null);
  const [projects, setProjects] = useState<CgateProjectInfo[]>([]);
  const [networks, setNetworks] = useState<CgateNetworkInfo[]>([]);
  const [activeNetwork, setActiveNetwork] = useState<string | null>(null);
  const activeNetworkRef = useRef<string | null>(null);
  activeNetworkRef.current = activeNetwork;
  const [networkHealth, setNetworkHealth] = useState<CgateNetworkInfo | null>(null);
  const [netBusy, setNetBusy] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [uiMode, setUiMode] = useState<UiMode>('operate');
  const [commissionView, setCommissionView] = useState<'inventory' | 'groups'>('groups');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  // Labels imported from a project file, re-applied whenever a tree (re)loads.
  const [imported, setImported] = useState<LabelImport | null>(null);
  // Addresses whose label was renamed but not yet saved to the project DB.
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [confirmSave, setConfirmSave] = useState(false);
  const [statusPanelOpen, setStatusPanelOpen] = useState(false);
  const statusPanelWrapRef = useRef<HTMLDivElement>(null);
  const [serverStatus, setServerStatus] = useState<CgateServerStatus | null>(null);
  const [serverStatusLoading, setServerStatusLoading] = useState(false);
  const [selection, setSelection] = useState<TreeSelection | null>(null);
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  const reconcileTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastTrigger, setLastTrigger] = useState<TriggerActivity | null>(null);

  // Monotonic tokens: each (re)connect bumps them so stale connect/getTree work
  // and enrichment can't apply onto a newer session.
  const connectGen = useRef(0);
  const enrichGen = useRef(0);
  const [connectBusy, setConnectBusy] = useState(false);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const importedRef = useRef(imported);
  importedRef.current = imported;

  const applyLevel = (address: string, level: number) =>
    setStates((prev) => ({ ...prev, [address]: { address, level, on: level > 0, ramping: false } }));

  // After the initial tree renders, lazily pull each group's tag name + live
  // level from C-Gate and merge them in as they arrive. Bounded concurrency
  // keeps the (serialized) command channel responsive; the generation token
  // discards results once the user has reconnected elsewhere. A locally-pending
  // rename or an imported label always wins over the fetched tag.
  async function enrichTree(groups: GroupNode[], gen: number) {
    const CONCURRENCY = 6;
    let cursor = 0;
    const worker = async () => {
      while (cursor < groups.length && enrichGen.current === gen) {
        const g = groups[cursor++];
        let detail;
        try {
          detail = await cgate().nodes.getGroupDetail(refOf(g));
        } catch {
          continue; // skip this node, keep enriching the rest
        }
        if (enrichGen.current !== gen) return;
        const imp = importedRef.current;
        if (detail.label && !dirtyRef.current.has(g.address) && !(imp && imp.groups[g.address] != null)) {
          const label = detail.label;
          setTree((prev) => setGroupLabel(prev, g.address, label));
        }
        if (detail.level != null) {
          const level = detail.level;
          // A live event is always fresher, so never overwrite an existing state.
          setStates((prev) =>
            prev[g.address] ? prev : { ...prev, [g.address]: { address: g.address, level, on: level > 0, ramping: false } });
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, groups.length) }, worker));
  }

  const actions: GroupActions = {
    setLevel: (g, level, rampSecs) => {
      applyLevel(g.address, level); // optimistic; the event stream confirms
      cgate().control.setLevel(refOf(g), level, rampSecs).catch((e) => setError(errMsg(e)));
    },
    terminateRamp: (g) => {
      cgate().control.terminateRamp(refOf(g)).catch((e) => setError(errMsg(e)));
    },
    rename: (g, name) => {
      cgate()
        .labels.rename(refOf(g), name)
        .then(() => {
          setTree((prev) => relabel(prev, g.address, name || null));
          setDirty((prev) => new Set(prev).add(g.address));
        })
        .catch((e) => setError(errMsg(e)));
    },
    fireScene: (g, actionSelector) => {
      cgate().control.fireScene(refOf(g), actionSelector).catch((e) => setError(errMsg(e)));
    },
  };

  async function importLabels() {
    setError(null);
    setNotice(null);
    try {
      const imp = await cgate().project.import();
      if (!imp) return; // user cancelled the file picker
      await cgate().sites.saveImportedLabels(activeSiteId, imp);
      setImported(imp);
      setTree((prev) => (prev.length ? applyImportedLabels(prev, imp) : prev));
      const scope = activeSiteId ? 'this site' : 'all sites';
      setNotice(
        `Imported ${imp.stats.labelCount} label${imp.stats.labelCount === 1 ? '' : 's'} from ${imp.source} (saved for ${scope}).`,
      );
    } catch (e) {
      setError(errMsg(e));
    }
  }

  async function exportLabels() {
    setError(null);
    setNotice(null);
    try {
      const result = await cgate().project.export({ tree, projectName });
      if (!result) return; // user cancelled the save dialog
      const { stats, path: savedPath } = result;
      const base = savedPath.split(/[/\\]/).pop() ?? savedPath;
      setNotice(
        `Exported ${stats.labelCount} group label${stats.labelCount === 1 ? '' : 's'}`
        + ` (${stats.groupCount} groups, ${stats.unitCount} units) to ${base}.`,
      );
    } catch (e) {
      setError(errMsg(e));
    }
  }

  function saveProject() {
    cgate()
      .project.save()
      .then(() => { setDirty(new Set()); setConfirmSave(false); })
      .catch((e) => { setError(errMsg(e)); setConfirmSave(false); });
  }

  async function refreshServerStatus() {
    if (status !== 'connected') {
      setServerStatus(null);
      return;
    }
    setServerStatusLoading(true);
    try {
      setServerStatus(await cgate().getServerStatus());
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setServerStatusLoading(false);
    }
  }

  function toggleStatusPanel() {
    setStatusPanelOpen((open) => {
      const next = !open;
      if (next) void refreshServerStatus();
      return next;
    });
  }

  useEffect(() => {
    cgate().sites.list().then(setSites);
    // Restore a global label import from the last session (site-specific imports
    // are loaded when that site is connected).
    cgate().sites.getImportedLabels(null).then((imp) => {
      if (imp) setImported(imp);
    });
    const offStatus = cgate().onStatus(setStatus);
    const offState = cgate().onState((s) =>
      setStates((prev) => ({ ...prev, [s.address]: s })));
    const offTrigger = cgate().onTrigger((t) => setLastTrigger(t));
    const offMeasurement = cgate().onMeasurement((m) =>
      setMeasurements((prev) => ({ ...prev, [m.address]: m })));
    const offActivity = cgate().onActivity((a) =>
      setActivity((prev) => [...prev.slice(-199), a]));
    const offTreeChanged = cgate().onTreeChanged(() => {
      if (reconcileTimer.current) clearTimeout(reconcileTimer.current);
      reconcileTimer.current = setTimeout(() => {
        const net = activeNetworkRef.current;
        if (!net) return;
        cgate().getTree(net).then((t) => {
          const imp = importedRef.current;
          setTree(imp ? applyImportedLabels(t, imp) : t);
        }).catch(() => {});
      }, 500);
    });
    return () => {
      offStatus();
      offState();
      offTrigger();
      offMeasurement();
      offActivity();
      offTreeChanged();
      if (reconcileTimer.current) clearTimeout(reconcileTimer.current);
    };
  }, []);

  useEffect(() => {
    if (statusPanelOpen && status === 'connected') void refreshServerStatus();
    if (status === 'disconnected') setServerStatus(null);
  }, [status, statusPanelOpen]);

  useEffect(() => {
    if (!selection) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelection(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection]);

  async function addSite(input: SiteInput) {
    setSites(await cgate().sites.add(input));
  }

  async function saveSite(site: Site) {
    setSites(await cgate().sites.update(site));
    setEditingSite(null);
  }

  async function removeSite(id: string) {
    setSites(await cgate().sites.remove(id));
    if (id === activeSiteId) setActiveSiteId(null);
    if (editingSite?.id === id) setEditingSite(null);
  }

  async function disconnectSite() {
    const gen = ++connectGen.current;
    ++enrichGen.current;
    setConnectBusy(false);
    try {
      await cgate().disconnect();
    } catch (e) {
      setError(errMsg(e));
    }
    if (connectGen.current !== gen) return;
    setTree([]);
    setStates({});
    setMeasurements({});
    setProjectName(null);
    setProjects([]);
    setNetworks([]);
    setActiveNetwork(null);
    setNetworkHealth(null);
    setActivity([]);
    setDirty(new Set());
    setConfirmSave(false);
    setSelection(null);
  }

  /** Activate a project on C-Gate: load (if needed) → start → use. */
  async function activateProject(name: string): Promise<void> {
    const loaded = await cgate().project.list();
    const onDisk = await cgate().project.dir();
    setProjects(mergeProjects(onDisk, loaded));
    const already = loaded.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (!already) {
      try {
        await cgate().project.load(name);
      } catch {
        // May already be loaded under another state — continue to start/use.
      }
    }
    try {
      await cgate().project.start(name);
    } catch {
      // Already started is fine.
    }
    await cgate().project.use(name);
    setProjectName(name);
    const refreshed = await cgate().project.list();
    setProjects(mergeProjects(onDisk, refreshed));
  }

  async function loadTreeForNetwork(
    network: string,
    gen: number,
    enrichGenForTree: number,
    imp: LabelImport | null,
  ) {
    setActiveNetwork(network);
    try {
      const health = await cgate().net.health(network);
      if (connectGen.current === gen) setNetworkHealth(health);
    } catch {
      if (connectGen.current === gen) {
        setNetworkHealth({ address: network, state: null, interfaceState: null, syncState: null });
      }
    }
    const t = await cgate().getTree(network);
    if (connectGen.current !== gen) return;
    const display = imp ? applyImportedLabels(t, imp) : t;
    setTree(display);
    cgate().nodes.getNetworkLevels(network).then((levels) => {
      if (connectGen.current !== gen) return;
      const entries = Object.entries(levels);
      if (entries.length > 0) {
        setStates((prev) => {
          const next = { ...prev };
          for (const [address, level] of entries) {
            if (!next[address]) next[address] = { address, level, on: level > 0, ramping: false };
          }
          return next;
        });
      }
    }).catch(() => {});
    if (enrichGen.current === enrichGenForTree) {
      void enrichTree(collectGroups(display), enrichGenForTree);
    }
  }

  async function runNetOp(op: 'open' | 'close' | 'sync' | 'health') {
    const net = activeNetworkRef.current;
    if (!net) return;
    setError(null);
    setNetBusy(true);
    try {
      if (op === 'open') await cgate().net.open(net);
      else if (op === 'close') await cgate().net.close(net);
      else if (op === 'sync') await cgate().net.sync(net);
      const health = await cgate().net.health(net);
      setNetworkHealth(health);
      const nets = await cgate().net.list();
      setNetworks(nets);
      if (op === 'sync' || op === 'open') {
        const gen = connectGen.current;
        const enrichGenForTree = ++enrichGen.current;
        await loadTreeForNetwork(net, gen, enrichGenForTree, importedRef.current);
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setNetBusy(false);
    }
  }

  async function selectProject(name: string) {
    setError(null);
    setConnectBusy(true);
    const gen = connectGen.current;
    const enrichGenForTree = ++enrichGen.current;
    try {
      await activateProject(name);
      if (connectGen.current !== gen) return;
      const nets = await cgate().net.list();
      if (connectGen.current !== gen) return;
      setNetworks(nets);
      const nextNet = pickNetwork(nets, activeNetworkRef.current);
      if (!nextNet) {
        setTree([]);
        setActiveNetwork(null);
        return;
      }
      await loadTreeForNetwork(nextNet, gen, enrichGenForTree, importedRef.current);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      if (connectGen.current === gen) setConnectBusy(false);
    }
  }

  async function selectNetwork(address: string) {
    setError(null);
    setConnectBusy(true);
    const gen = connectGen.current;
    const enrichGenForTree = ++enrichGen.current;
    setStates({});
    setMeasurements({});
    setSelection(null);
    try {
      await loadTreeForNetwork(address, gen, enrichGenForTree, importedRef.current);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      if (connectGen.current === gen) setConnectBusy(false);
    }
  }

  async function connectSite(site: Site) {
    const gen = ++connectGen.current;
    const enrichGenForTree = ++enrichGen.current;
    setConnectBusy(true);
    setActiveSiteId(site.id);
    setStates({});
    setMeasurements({});
    setTree([]);
    setError(null);
    setProjectName(null);
    setProjects([]);
    setNetworks([]);
    setActiveNetwork(null);
    setNetworkHealth(null);
    setActivity([]);
    setDirty(new Set());
    setConfirmSave(false);
    setSelection(null);
    const imp = await cgate().sites.getImportedLabels(site.id);
    if (connectGen.current !== gen) return;
    setImported(imp);
    try {
      await cgate().connect({
        host: site.host,
        commandPort: site.commandPort,
        eventPort: site.eventPort,
        username: site.username,
        password: site.password,
        project: site.defaultProject,
      });
      if (connectGen.current !== gen) return;

      const onDisk = await cgate().project.dir();
      const loaded = await cgate().project.list();
      if (connectGen.current !== gen) return;
      const allProjects = mergeProjects(onDisk, loaded);
      setProjects(allProjects);

      const chosenProject =
        (site.defaultProject && allProjects.find((p) => p.name === site.defaultProject)?.name) ||
        loaded.find((p) => p.state?.toLowerCase() === 'started')?.name ||
        allProjects[0]?.name ||
        null;

      if (chosenProject) {
        await activateProject(chosenProject);
        if (connectGen.current !== gen) return;
      } else {
        const name = await cgate().project.name();
        if (connectGen.current !== gen) return;
        if (name) setProjectName(name);
      }

      const nets = await cgate().net.list();
      if (connectGen.current !== gen) return;
      setNetworks(nets);
      const network = pickNetwork(nets, site.defaultNetwork ?? null);
      if (!network) {
        setError(
          'No networks found for this project. Check the Network menu after the project is started, or open the network in C-Gate/Toolkit.',
        );
        return;
      }
      await loadTreeForNetwork(network, gen, enrichGenForTree, imp);
    } catch (e) {
      if (connectGen.current !== gen) return;
      const msg = e instanceof Error ? e.message : String(e);
      // A newer connect() tore this one down; don't show a scary error for that.
      if (msg === CONNECTION_SUPERSEDED || msg === 'Disconnected during getTree') return;
      setError(msg);
    } finally {
      if (connectGen.current === gen) setConnectBusy(false);
    }
  }

  async function bulkSetLevel(groups: GroupNode[], level: number) {
    if (groups.length === 0) return;
    setBulkBusy(true);
    setError(null);
    const CONCURRENCY = 4;
    let cursor = 0;
    const worker = async () => {
      while (cursor < groups.length) {
        const g = groups[cursor++];
        applyLevel(g.address, level);
        try {
          await cgate().control.setLevel(refOf(g), level);
        } catch (e) {
          setError(errMsg(e));
        }
      }
    };
    try {
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, groups.length) }, worker));
    } finally {
      setBulkBusy(false);
    }
  }

  async function clearGroupLabels(groups: GroupNode[]) {
    if (groups.length === 0) return;
    setBulkBusy(true);
    setError(null);
    try {
      for (const g of groups) {
        try {
          await cgate().labels.clear(refOf(g));
          setTree((prev) => relabel(prev, g.address, null));
          setDirty((prev) => new Set(prev).add(g.address));
        } catch (e) {
          setError(errMsg(e));
        }
      }
    } finally {
      setBulkBusy(false);
    }
  }

  const activeSite = sites.find((s) => s.id === activeSiteId) ?? null;
  const flatGroups = collectGroups(tree);

  return (
    <div className="app">
      <header className="app__header">
        <div className="brand">
          <span className="brand__mark" aria-hidden>C</span>
          <span className="brand__name">CBus Studio</span>
          {activeSite && (
            <span className="brand__site">
              &nbsp;&middot;&nbsp; <b>{activeSite.name}</b>
            </span>
          )}
        </div>
        {status === 'connected' && (
          <ModeToggle mode={uiMode} onChange={setUiMode} disabled={connectBusy} />
        )}
        {status === 'connected' && (
          <SessionBar
            projects={projects}
            networks={networks}
            projectName={projectName}
            activeNetwork={activeNetwork}
            busy={connectBusy}
            onSelectProject={selectProject}
            onSelectNetwork={selectNetwork}
          />
        )}
        <div className="headerRight">
          <button type="button" className="btn btn--ghost btn--sm" onClick={importLabels}>
            Import labels
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={exportLabels}
            disabled={tree.length === 0}
            title={tree.length === 0 ? 'Connect to a network first' : 'Export labels to a C-Bus project file'}
          >
            Export labels
          </button>
          <div className="statusPanelWrap" ref={statusPanelWrapRef}>
            <button
              type="button"
              className="statusDotBtn"
              onClick={toggleStatusPanel}
              aria-expanded={statusPanelOpen}
              aria-haspopup="dialog"
              aria-label={`C-Gate status: ${status}`}
              title={`C-Gate status: ${status} — click for details`}
            >
              <span
                className="statusDot statusDot--lg"
                role="img"
                aria-hidden
                style={{ background: STATUS_COLORS[status], color: STATUS_COLORS[status] }}
              />
            </button>
            <CgateStatusPanel
              open={statusPanelOpen}
              connection={status}
              server={serverStatus}
              loading={serverStatusLoading}
              onRefresh={refreshServerStatus}
              onClose={() => setStatusPanelOpen(false)}
              dismissRootRef={statusPanelWrapRef}
            />
          </div>
        </div>
      </header>

      {error && (
        <div className="flashBanner flashBanner--error" role="alert">
          <span className="flashBanner__text" title={error}>{error}</span>
          <button
            type="button"
            className="btn btn--sm btn--ghost flashBanner__dismiss"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      {!error && notice && (
        <div className="flashBanner flashBanner--notice" role="status">
          <span className="flashBanner__text" title={notice}>{notice}</span>
          <button
            type="button"
            className="btn btn--sm btn--ghost flashBanner__dismiss"
            onClick={() => setNotice(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {status === 'connected' && (
        <StatusBar
          connection={status}
          projectName={projectName}
          network={activeNetwork}
          health={networkHealth}
          netBusy={netBusy || connectBusy}
          onOpen={() => { void runNetOp('open'); }}
          onClose={() => { void runNetOp('close'); }}
          onSync={() => { void runNetOp('sync'); }}
          onRefreshHealth={() => { void runNetOp('health'); }}
          onToggleActivity={() => setActivityOpen((v) => !v)}
          activityOpen={activityOpen}
        />
      )}

      {dirty.size > 0 && (
        <div className="banner">
          <span className="banner__dot" aria-hidden />
          <span className="banner__spacer">
            {dirty.size} unsaved project change{dirty.size === 1 ? '' : 's'}.
            {confirmSave && <strong>&nbsp; Write to the project database on the C-Gate server?</strong>}
          </span>
          {confirmSave ? (
            <>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmSave(false)}>Cancel</button>
              <button type="button" className="btn btn--primary btn--sm" onClick={saveProject}>Confirm save</button>
            </>
          ) : (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => setConfirmSave(true)}>Save to project</button>
          )}
        </div>
      )}

      <div className="app__body">
        <aside className="sidebar">
          <h3 className="sidebar__title">Sites</h3>
          <div className="sidebar__scroll">
            <SiteList
              sites={sites}
              activeId={activeSiteId}
              activeStatus={status}
              connectDisabled={connectBusy || status === 'connecting'}
              onConnect={connectSite}
              onDisconnect={() => { void disconnectSite(); }}
              onEdit={setEditingSite}
              onRemove={removeSite}
            />
          </div>
          {editingSite ? (
            <SiteForm
              mode="edit"
              initial={editingSite}
              onSave={(s) => { void saveSite(s); }}
              onCancel={() => setEditingSite(null)}
            />
          ) : (
            <SiteForm mode="add" onAdd={addSite} />
          )}
        </aside>
        <main className={`main${selection ? ' main--split' : ''}${activityOpen ? ' main--activity' : ''}`}>
          {lastTrigger && (
            <div className="lastTrigger" title={lastTrigger.address}>
              Fired {lastTrigger.address} → {lastTrigger.actionSelector}
            </div>
          )}
          <div className="main__tree">
            {uiMode === 'operate' ? (
              <DeviceTree
                tree={tree}
                states={states}
                measurements={measurements}
                actions={status === 'connected' ? actions : undefined}
                projectName={projectName}
                connected={status === 'connected' || status === 'reconnecting'}
                selection={selection}
                onSelect={setSelection}
              />
            ) : (
              <div className="commission">
                <div className="commission__bar">
                  <div className="commission__tabs" role="tablist" aria-label="Commission views">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={commissionView === 'groups'}
                      className={`commission__tab${commissionView === 'groups' ? ' commission__tab--active' : ''}`}
                      onClick={() => setCommissionView('groups')}
                    >
                      Groups
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={commissionView === 'inventory'}
                      className={`commission__tab${commissionView === 'inventory' ? ' commission__tab--active' : ''}`}
                      onClick={() => setCommissionView('inventory')}
                    >
                      Inventory
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn btn--sm"
                    disabled={!activeNetwork || netBusy || connectBusy}
                    onClick={() => void runNetOp('sync')}
                    title="Sync network and reload the tree (not unit programming)"
                  >
                    {netBusy ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>
                {commissionView === 'groups' ? (
                  <GroupsWorkspace
                    groups={flatGroups}
                    states={states}
                    selection={selection}
                    onSelect={setSelection}
                    onBulkSetLevel={status === 'connected' ? bulkSetLevel : undefined}
                    onClearLabels={status === 'connected' ? clearGroupLabels : undefined}
                    bulkBusy={bulkBusy}
                  />
                ) : (
                  <InventoryTable
                    tree={tree}
                    selection={selection}
                    onSelect={setSelection}
                  />
                )}
              </div>
            )}
          </div>
          {selection && (
            <EntityPanel
              selection={selection}
              state={selection.kind === 'group' ? states[selection.group.address] : undefined}
              actions={status === 'connected' ? actions : undefined}
              connected={status === 'connected'}
              onGroupRenamed={(g, name) => {
                setTree((prev) => relabel(prev, g.address, name || null));
                setDirty((prev) => new Set(prev).add(g.address));
              }}
              onUnitRenamed={(net, addr, name) => {
                setTree((prev) => prev.map((n) => n.address !== net ? n : {
                  ...n,
                  units: n.units.map((u) => u.address === addr ? { ...u, name: name || null } : u),
                }));
              }}
              onProjectDirty={(key) => {
                setDirty((prev) => new Set(prev).add(key));
              }}
              onError={setError}
              onClose={() => setSelection(null)}
            />
          )}
          <ActivityDrawer
            open={activityOpen}
            entries={activity}
            onClose={() => setActivityOpen(false)}
          />
        </main>
      </div>
    </div>
  );
}
