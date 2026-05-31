import React, { useState } from 'react';
import type { SiteInput } from '../../shared/types';

export function SiteForm({ onAdd }: { onAdd: (s: SiteInput) => void }) {
  const [name, setName] = useState('');
  const [host, setHost] = useState('127.0.0.1');
  const [commandPort, setCommandPort] = useState(20023);
  const [eventPort, setEventPort] = useState(20025);

  return (
    <form
      className="siteForm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd({ name: name.trim(), host: host.trim(), commandPort, eventPort });
        setName('');
      }}
    >
      <div className="siteForm__title">Add a site</div>
      <label className="field">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Home" />
      </label>
      <label className="field">
        Host
        <input value={host} onChange={(e) => setHost(e.target.value)} placeholder="127.0.0.1" />
      </label>
      <div className="field--row">
        <label className="field">
          Cmd
          <input type="number" value={commandPort} onChange={(e) => setCommandPort(+e.target.value)} />
        </label>
        <label className="field">
          Event
          <input type="number" value={eventPort} onChange={(e) => setEventPort(+e.target.value)} />
        </label>
      </div>
      <button type="submit" className="btn btn--primary">Add site</button>
    </form>
  );
}
