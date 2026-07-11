import React from 'react';
import type { CgateNetworkInfo } from '../../shared/types';
import type { CgateProjectInfo } from '../../shared/cgateStatus';

export function SessionBar({
  projects,
  networks,
  projectName,
  activeNetwork,
  busy,
  onSelectProject,
  onSelectNetwork,
}: {
  projects: CgateProjectInfo[];
  networks: CgateNetworkInfo[];
  projectName: string | null;
  activeNetwork: string | null;
  busy?: boolean;
  onSelectProject: (name: string) => void;
  onSelectNetwork: (address: string) => void;
}) {
  const projectOptions = uniqueProjects(projects, projectName);

  return (
    <div className="sessionBar" role="group" aria-label="C-Gate session">
      <label className="sessionBar__field">
        Project
        <select
          value={projectName ?? ''}
          disabled={busy || projectOptions.length === 0}
          onChange={(e) => {
            if (e.target.value) onSelectProject(e.target.value);
          }}
          aria-label="Active project"
        >
          {projectOptions.length === 0 && <option value="">No projects</option>}
          {projectOptions.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}{p.state ? ` (${p.state})` : ''}
            </option>
          ))}
        </select>
      </label>
      <label className="sessionBar__field">
        Network
        <select
          value={activeNetwork ?? ''}
          disabled={busy || networks.length === 0}
          onChange={(e) => {
            if (e.target.value) onSelectNetwork(e.target.value);
          }}
          aria-label="Active network"
        >
          {networks.length === 0 && <option value="">No networks</option>}
          {networks.map((n) => (
            <option key={n.address} value={n.address}>
              {n.address}{n.state ? ` · ${n.state}` : ''}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function uniqueProjects(
  projects: CgateProjectInfo[],
  active: string | null,
): CgateProjectInfo[] {
  const byName = new Map<string, CgateProjectInfo>();
  for (const p of projects) byName.set(p.name, p);
  if (active && !byName.has(active)) byName.set(active, { name: active, state: null });
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
