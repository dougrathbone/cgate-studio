import React from 'react';
import type { GroupState } from '../../shared/types';

export function StateBadge({ state }: { state?: GroupState }) {
  if (!state) return <span style={{ color: '#999' }}>—</span>;
  const pct = Math.round((state.level / 255) * 100);
  return (
    <span style={{ color: state.on ? '#1a7f37' : '#999', fontVariantNumeric: 'tabular-nums' }}>
      {state.on ? `ON ${pct}%` : 'OFF'}
    </span>
  );
}
