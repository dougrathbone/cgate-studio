import React from 'react';
import type { Site } from '../../shared/types';

export function SiteList({
  sites,
  activeId,
  onConnect,
  onRemove,
}: {
  sites: Site[];
  activeId: string | null;
  onConnect: (s: Site) => void;
  onRemove: (id: string) => void;
}) {
  if (sites.length === 0) {
    return <p style={{ color: '#999', padding: 12 }}>No sites yet — add one below.</p>;
  }
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {sites.map((s) => (
        <li
          key={s.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: s.id === activeId ? '#eef6ff' : undefined,
          }}
        >
          <span style={{ flex: 1 }}>
            <strong>{s.name}</strong>
            <br />
            <small style={{ color: '#666' }}>
              {s.host}:{s.commandPort}/{s.eventPort}
            </small>
          </span>
          <button onClick={() => onConnect(s)}>
            {s.id === activeId ? 'Reconnect' : 'Connect'}
          </button>
          <button onClick={() => onRemove(s.id)} aria-label={`Delete ${s.name}`}>
            Delete
          </button>
        </li>
      ))}
    </ul>
  );
}
