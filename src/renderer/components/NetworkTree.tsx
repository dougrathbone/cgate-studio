import React from 'react';
import type { Tree, GroupState } from '../../shared/types';
import { StateBadge } from './StateBadge';

export function NetworkTree({ tree, states }: { tree: Tree; states: Record<string, GroupState> }) {
  if (tree.length === 0) return <p style={{ color: '#999' }}>Not connected.</p>;
  return (
    <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
      {tree.map((net) => (
        <li key={net.address}>
          <strong>Network {net.address}{net.label ? ` — ${net.label}` : ''}</strong>
          <ul>
            {net.applications.map((app) => (
              <li key={app.address}>
                App {app.address}
                <ul>
                  {app.groups.map((g) => (
                    <li key={g.address} style={{ display: 'flex', gap: 8 }}>
                      <span style={{ minWidth: 220 }}>
                        {g.address}{g.label ? ` — ${g.label}` : ''}
                      </span>
                      <StateBadge state={states[g.address]} />
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
