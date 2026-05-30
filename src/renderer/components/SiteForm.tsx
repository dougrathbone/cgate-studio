import React, { useState } from 'react';
import type { SiteInput } from '../../shared/types';

export function SiteForm({ onAdd }: { onAdd: (s: SiteInput) => void }) {
  const [name, setName] = useState('');
  const [host, setHost] = useState('127.0.0.1');
  const [commandPort, setCommandPort] = useState(20023);
  const [eventPort, setEventPort] = useState(20025);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd({ name: name.trim(), host: host.trim(), commandPort, eventPort });
        setName('');
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12 }}
    >
      <strong>Add a site</strong>
      <label>Name <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Home" /></label>
      <label>Host <input value={host} onChange={(e) => setHost(e.target.value)} /></label>
      <label>Cmd <input type="number" value={commandPort} onChange={(e) => setCommandPort(+e.target.value)} style={{ width: 90 }} /></label>
      <label>Event <input type="number" value={eventPort} onChange={(e) => setEventPort(+e.target.value)} style={{ width: 90 }} /></label>
      <button type="submit">Add site</button>
    </form>
  );
}
