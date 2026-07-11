import React from 'react';
import type { ConnectionStatus } from '../../shared/types';
import type { CgateServerStatus } from '../../shared/cgateStatus';

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  connected: 'Connected',
  connecting: 'Connecting…',
  reconnecting: 'Reconnecting…',
  disconnected: 'Disconnected',
  error: 'Error',
};

function row(label: string, value: React.ReactNode) {
  return (
    <div className="statusPanel__row" key={label}>
      <dt className="statusPanel__key">{label}</dt>
      <dd className="statusPanel__val">{value}</dd>
    </div>
  );
}

function projectList(items: CgateServerStatus['loadedProjects']) {
  if (items.length === 0) return <span className="statusPanel__muted">None</span>;
  return (
    <ul className="statusPanel__list">
      {items.map((p) => (
        <li key={p.name}>
          <span className="statusPanel__mono">{p.name}</span>
          {p.state && <span className="statusPanel__tag">{p.state}</span>}
        </li>
      ))}
    </ul>
  );
}

export function CgateStatusPanel({
  open,
  connection,
  server,
  loading,
  onRefresh,
  onClose,
}: {
  open: boolean;
  connection: ConnectionStatus;
  server: CgateServerStatus | null;
  loading: boolean;
  onRefresh: () => void;
  onClose: () => void;
}) {
  if (!open) return null;

  const connOk = server?.commandConnected && server?.eventConnected;

  return (
    <div className="statusPanel" role="dialog" aria-label="C-Gate server status">
      <header className="statusPanel__header">
        <h2 className="statusPanel__title">C-Gate server</h2>
        <div className="statusPanel__actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onRefresh}
            disabled={loading || connection !== 'connected'}
          >
            {loading ? 'Querying…' : 'Refresh'}
          </button>
          <button
            type="button"
            className="statusPanel__close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M3 3l8 8M11 3L3 11"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <dl className="statusPanel__grid">
        {row('Connection', STATUS_LABEL[connection])}
        {server?.host && row('Host', (
          <span className="statusPanel__mono">{server.host}:{server.commandPort} / {server.eventPort}</span>
        ))}
        {row('TCP channels', server ? (
          <span>
            Command {server.commandConnected ? 'up' : 'down'}
            {' · '}
            Event {server.eventConnected ? 'up' : 'down'}
            {!connOk && connection === 'connected' && (
              <span className="statusPanel__warn"> — partial</span>
            )}
          </span>
        ) : '—')}
        {row('Server version', server?.serverVersion ?? (
          <span className="statusPanel__muted">Not available — connect to query</span>
        ))}
        {server?.activeProject && row('Active project', (
          <>
            <span className="statusPanel__mono">{server.activeProject.name}</span>
            {server.activeProject.state && (
              <span className="statusPanel__tag">{server.activeProject.state}</span>
            )}
          </>
        ))}
        {server && connection === 'connected' && row('Loaded projects', projectList(server.loadedProjects))}
        {server && connection === 'connected' && row('Projects on disk', projectList(server.projectsOnDisk))}
      </dl>

      {server?.serverGreeting && (
        <p className="statusPanel__greeting" title={server.serverGreeting}>
          {server.serverGreeting}
        </p>
      )}
    </div>
  );
}
