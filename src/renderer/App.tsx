import React, { useEffect, useRef, useState } from 'react';
import { cgate } from './api';
import { SiteForm } from './components/SiteForm';
import { SiteList } from './components/SiteList';
import { DeviceTree } from './components/DeviceTree';
import { CgateStatusPanel } from './components/CgateStatusPanel';
import type { GroupActions } from './components/GroupRow';
import type { ConnectionStatus, Tree, GroupState, GroupNode, Site, SiteInput, LabelImport } from '../shared/types';
import type { CgateServerStatus } from '../shared/cgateStatus';

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

export function App() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [tree, setTree] = useState<Tree>([]);
  const [states, setStates] = useState<Record<string, GroupState>>({});
  const [sites, setSites] = useState<Site[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // The active C-Gate project name, shown next to the network to identify it.
  const [projectName, setProjectName] = useState<string | null>(null);
  // Labels imported from a project file, re-applied whenever a tree (re)loads.
  const [imported, setImported] = useState<LabelImport | null>(null);
  // Addresses whose label was renamed but not yet saved to the project DB.
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [confirmSave, setConfirmSave] = useState(false);
  const [statusPanelOpen, setStatusPanelOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState<CgateServerStatus | null>(null);
  const [serverStatusLoading, setServerStatusLoading] = useState(false);

  // Monotonic token: each (re)connect bumps it so enrichment from a stale
  // connection can't apply onto a newer tree. Refs let the async enrichment
  // closure read the latest dirty/imported state without re-binding.
  const enrichGen = useRef(0);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const importedRef = useRef(imported);
  importedRef.current = imported;

  const applyLevel = (address: string, level: number) =>
    setStates((prev) => ({ ...prev, [address]: { address, level, on: level > 0 } }));

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
            prev[g.address] ? prev : { ...prev, [g.address]: { address: g.address, level, on: level > 0 } });
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
    return () => { offStatus(); offState(); };
  }, []);

  useEffect(() => {
    if (statusPanelOpen && status === 'connected') void refreshServerStatus();
    if (status === 'disconnected') setServerStatus(null);
  }, [status, statusPanelOpen]);

  async function addSite(input: SiteInput) {
    setSites(await cgate().sites.add(input));
  }

  async function removeSite(id: string) {
    setSites(await cgate().sites.remove(id));
    if (id === activeSiteId) setActiveSiteId(null);
  }

  async function connectSite(site: Site) {
    const gen = ++enrichGen.current; // invalidate any in-flight enrichment
    setActiveSiteId(site.id);
    setStates({});
    setTree([]);
    setError(null);
    setProjectName(null);
    setDirty(new Set());
    setConfirmSave(false);
    const imp = await cgate().sites.getImportedLabels(site.id);
    setImported(imp);
    try {
      await cgate().connect({
        host: site.host,
        commandPort: site.commandPort,
        eventPort: site.eventPort,
      });
      cgate().project.name().then(setProjectName).catch(() => {});
      const t = await cgate().getTree('254');
      const display = imp ? applyImportedLabels(t, imp) : t;
      setTree(display);
      if (enrichGen.current === gen) {
        void enrichTree(collectGroups(display), gen);
      }
    } catch (e) {
      // Surface connect/getTree failures in the UI instead of letting them
      // bubble up as an unhandled promise rejection.
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const activeSite = sites.find((s) => s.id === activeSiteId) ?? null;

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
        <div className="headerRight">
          {notice && <span className="statusNotice" title={notice}>{notice}</span>}
          {error && <span className="statusError" title={error}>⚠ {error}</span>}
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
          <div className="statusPanelWrap">
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
            />
          </div>
        </div>
      </header>

      {dirty.size > 0 && (
        <div className="banner">
          <span className="banner__dot" aria-hidden />
          <span className="banner__spacer">
            {dirty.size} unsaved label change{dirty.size === 1 ? '' : 's'}.
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
              onConnect={connectSite}
              onRemove={removeSite}
            />
          </div>
          <SiteForm onAdd={addSite} />
        </aside>
        <main className="main">
          <DeviceTree tree={tree} states={states} actions={status === 'connected' ? actions : undefined} projectName={projectName} />
        </main>
      </div>
    </div>
  );
}
