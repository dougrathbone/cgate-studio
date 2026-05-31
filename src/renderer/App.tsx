import React, { useEffect, useState } from 'react';
import { cgate } from './api';
import { SiteForm } from './components/SiteForm';
import { SiteList } from './components/SiteList';
import { DeviceTree } from './components/DeviceTree';
import type { ConnectionStatus, Tree, GroupState, Site, SiteInput } from '../shared/types';

export function App() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [tree, setTree] = useState<Tree>([]);
  const [states, setStates] = useState<Record<string, GroupState>>({});
  const [sites, setSites] = useState<Site[]>([]);
  const [activeSiteId, setActiveSiteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    cgate().sites.list().then(setSites);
    const offStatus = cgate().onStatus(setStatus);
    const offState = cgate().onState((s) =>
      setStates((prev) => ({ ...prev, [s.address]: s })));
    return () => { offStatus(); offState(); };
  }, []);

  async function addSite(input: SiteInput) {
    setSites(await cgate().sites.add(input));
  }

  async function removeSite(id: string) {
    setSites(await cgate().sites.remove(id));
    if (id === activeSiteId) setActiveSiteId(null);
  }

  async function connectSite(site: Site) {
    setActiveSiteId(site.id);
    setStates({});
    setTree([]);
    setError(null);
    try {
      await cgate().connect({
        host: site.host,
        commandPort: site.commandPort,
        eventPort: site.eventPort,
      });
      setTree(await cgate().getTree('254'));
    } catch (e) {
      // Surface connect/getTree failures in the UI instead of letting them
      // bubble up as an unhandled promise rejection.
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ddd', padding: 12 }}>
        <strong>CBus Studio</strong>
        <span>
          Status: <strong>{status}</strong>
          {error && <span style={{ color: '#b00', marginLeft: 12 }}>⚠ {error}</span>}
        </span>
      </header>
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <aside style={{ width: 320, borderRight: '1px solid #ddd', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ margin: 0, padding: 12, borderBottom: '1px solid #eee' }}>Sites</h3>
          <SiteList sites={sites} activeId={activeSiteId} onConnect={connectSite} onRemove={removeSite} />
          <div style={{ marginTop: 'auto', borderTop: '1px solid #eee' }}>
            <SiteForm onAdd={addSite} />
          </div>
        </aside>
        <main style={{ flex: 1, overflow: 'auto', padding: 12 }}>
          <DeviceTree tree={tree} states={states} />
        </main>
      </div>
    </div>
  );
}
