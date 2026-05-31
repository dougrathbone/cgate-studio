import React from 'react';
import type { GroupState } from '../../shared/types';

export function StateBadge({ state }: { state?: GroupState }) {
  if (!state) return <span className="badge badge--unknown">&mdash;</span>;
  const pct = Math.round((state.level / 255) * 100);
  return (
    <span className={state.on ? 'badge badge--on' : 'badge badge--off'}>
      {state.on ? `ON ${pct}%` : 'OFF'}
    </span>
  );
}
