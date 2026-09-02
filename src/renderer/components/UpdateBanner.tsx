import React from 'react';
import type { AppUpdateStatus } from '../../shared/types';

export function UpdateBanner({
  status,
  onRestart,
  onDismiss,
}: {
  status: AppUpdateStatus | null;
  onRestart: () => void;
  onDismiss: () => void;
}) {
  if (!status) return null;
  if (status.state === 'idle' || status.state === 'dev' || status.state === 'not-available' || status.state === 'checking') {
    return null;
  }

  if (status.state === 'error') {
    return (
      <div className="flashBanner flashBanner--error" role="alert">
        <span className="flashBanner__text" title={status.message}>
          Update check failed{status.message ? `: ${status.message}` : ''}
        </span>
        <button type="button" className="btn btn--sm btn--ghost flashBanner__dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    );
  }

  if (status.state === 'available' || status.state === 'downloading') {
    const pct = status.percent != null ? ` (${Math.round(status.percent)}%)` : '';
    const label = status.state === 'downloading'
      ? `Downloading ${status.version ?? 'update'}${pct}…`
      : `Update ${status.version ?? ''} available — downloading…`;
    return (
      <div className="flashBanner flashBanner--notice" role="status">
        <span className="flashBanner__text">{label}</span>
      </div>
    );
  }

  if (status.state === 'ready') {
    return (
      <div className="banner banner--update" role="status">
        <span className="banner__dot" aria-hidden />
        <span className="banner__spacer">
          Version {status.version ?? 'a new build'} is ready to install.
        </span>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onDismiss}>Later</button>
        <button type="button" className="btn btn--primary btn--sm" onClick={onRestart}>Restart to update</button>
      </div>
    );
  }

  return null;
}
