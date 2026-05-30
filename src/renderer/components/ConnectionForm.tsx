import React, { useState } from 'react';
import type { ConnectOptions } from '../../shared/types';

export function ConnectionForm({ onConnect }: { onConnect: (o: ConnectOptions) => void }) {
  const [host, setHost] = useState('127.0.0.1');
  const [commandPort, setCommandPort] = useState(20023);
  const [eventPort, setEventPort] = useState(20025);

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onConnect({ host, commandPort, eventPort }); }}
      style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 12 }}
    >
      <label>Host <input value={host} onChange={(e) => setHost(e.target.value)} /></label>
      <label>Cmd <input type="number" value={commandPort} onChange={(e) => setCommandPort(+e.target.value)} style={{ width: 80 }} /></label>
      <label>Event <input type="number" value={eventPort} onChange={(e) => setEventPort(+e.target.value)} style={{ width: 80 }} /></label>
      <button type="submit">Connect</button>
    </form>
  );
}
