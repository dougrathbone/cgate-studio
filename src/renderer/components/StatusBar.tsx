import React from 'react';
import type { ConnectionStatus, CgateNetworkInfo } from '../../shared/types';
import { networkNeedsForce } from '../../shared/types';

export function StatusBar({
  connection,
  projectName,
  network,
  health,
  netBusy,
  onOpen,
  onClose,
  onSync,
  onRefreshHealth,
  onToggleActivity,
  activityOpen,
}: {
  connection: ConnectionStatus;
  projectName: string | null;
  network: string | null;
  health: CgateNetworkInfo | null;
  netBusy?: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSync: () => void;
  onRefreshHealth: () => void;
  onToggleActivity: () => void;
  activityOpen: boolean;
}) {
  const force = networkNeedsForce(health);
  const iface = health?.interfaceState ?? '—';
  const state = health?.state ?? '—';
  const sync = health?.syncState ?? '—';

  return (
    <div className="statusBar" role="status" aria-live="polite">
      <span className="statusBar__item">
        <span className="statusBar__label">Conn</span>
        <span className="statusBar__value">{connection}</span>
      </span>
      <span className="statusBar__item">
        <span className="statusBar__label">Project</span>
        <span className="statusBar__value">{projectName || '—'}</span>
      </span>
      <span className="statusBar__item">
        <span className="statusBar__label">Net</span>
        <span className="statusBar__value">{network || '—'}</span>
      </span>
      <span className="statusBar__item" title="Network State">
        <span className="statusBar__label">State</span>
        <span className={`statusBar__value${force ? ' statusBar__value--warn' : ''}`}>{state}</span>
      </span>
      <span className="statusBar__item" title="InterfaceState">
        <span className="statusBar__label">Iface</span>
        <span className="statusBar__value">{iface}</span>
      </span>
      <span className="statusBar__item" title="SyncState">
        <span className="statusBar__label">Sync</span>
        <span className="statusBar__value">{sync}</span>
      </span>
      {force && (
        <span className="statusBar__force" title="Lighting commands will append FORCE">
          FORCE
        </span>
      )}
      <span className="statusBar__spacer" />
      <button type="button" className="btn btn--sm" disabled={!network || netBusy} onClick={onOpen}>
        Open
      </button>
      <button type="button" className="btn btn--sm" disabled={!network || netBusy} onClick={onClose}>
        Close
      </button>
      <button type="button" className="btn btn--sm btn--primary" disabled={!network || netBusy} onClick={onSync}>
        {netBusy ? 'Working…' : 'Sync'}
      </button>
      <button type="button" className="btn btn--sm" disabled={!network || netBusy} onClick={onRefreshHealth}>
        Refresh
      </button>
      <button
        type="button"
        className="btn btn--sm"
        aria-pressed={activityOpen}
        onClick={onToggleActivity}
      >
        Activity
      </button>
    </div>
  );
}
