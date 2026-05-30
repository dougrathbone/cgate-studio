import React, { useEffect, useState } from 'react';
import { cgate } from './api';
import { ConnectionForm } from './components/ConnectionForm';
import type { ConnectionStatus, Tree, GroupState, ConnectOptions } from '../shared/types';

export function App() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [tree, setTree] = useState<Tree>([]);
  const [states, setStates] = useState<Record<string, GroupState>>({});

  useEffect(() => {
    const offStatus = cgate().onStatus(setStatus);
    const offState = cgate().onState((s) =>
      setStates((prev) => ({ ...prev, [s.address]: s })));
    return () => { offStatus(); offState(); };
  }, []);

  async function handleConnect(opts: ConnectOptions) {
    await cgate().connect(opts);
    setTree(await cgate().getTree('254'));
  }

  return (
    <div style={{ fontFamily: 'system-ui', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #ddd' }}>
        <ConnectionForm onConnect={handleConnect} />
        <span style={{ padding: 12 }}>Status: <strong>{status}</strong></span>
      </header>
      <main style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {/* NetworkTree rendered in Task 11 */}
        <pre>{JSON.stringify({ networks: tree.length, live: Object.keys(states).length }, null, 2)}</pre>
      </main>
    </div>
  );
}
