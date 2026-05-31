import React from 'react';
import type { Site, ConnectionStatus } from '../../shared/types';

const STATUS_COLORS: Record<ConnectionStatus, string> = {
  connected: 'var(--on)',
  connecting: 'var(--warn)',
  reconnecting: 'var(--warn)',
  disconnected: 'var(--off)',
  error: 'var(--danger)',
};

export function SiteList({
  sites,
  activeId,
  activeStatus,
  connectDisabled,
  onConnect,
  onRemove,
}: {
  sites: Site[];
  activeId: string | null;
  activeStatus?: ConnectionStatus;
  connectDisabled?: boolean;
  onConnect: (s: Site) => void;
  onRemove: (id: string) => void;
}) {
  if (sites.length === 0) {
    return <p className="siteList__empty">No sites yet — add one below.</p>;
  }
  return (
    <ul className="siteList">
      {sites.map((s) => {
        const active = s.id === activeId;
        return (
          <li key={s.id} className={active ? 'siteItem siteItem--active' : 'siteItem'}>
            <span className="siteItem__main">
              <span className="siteItem__name">
                {active && activeStatus && (
                  <span
                    className="statusDot"
                    title={activeStatus}
                    style={{ background: STATUS_COLORS[activeStatus], marginRight: 6, verticalAlign: 'middle' }}
                  />
                )}
                {s.name}
              </span>
              <small className="siteItem__addr">
                {s.host}:{s.commandPort}/{s.eventPort}
              </small>
            </span>
            <button
              className="btn btn--sm btn--primary"
              disabled={connectDisabled}
              onClick={() => onConnect(s)}
            >
              {active && connectDisabled ? 'Connecting…' : active ? 'Reconnect' : 'Connect'}
            </button>
            <button
              className="btn btn--danger btn--icon"
              onClick={() => onRemove(s.id)}
              aria-label={`Delete ${s.name}`}
              title={`Delete ${s.name}`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
