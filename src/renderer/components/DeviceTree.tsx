import React, { useMemo, useState } from 'react';
import type { Tree, NetworkNode, AppNode, GroupNode, UnitNode, GroupState } from '../../shared/types';
import { GroupRow, GroupActions } from './GroupRow';

const INDENT = 18;

function Caret({ open, hasChildren }: { open: boolean; hasChildren: boolean }) {
  return (
    <span className="row__caret">{hasChildren ? (open ? '\u25BE' : '\u25B8') : ''}</span>
  );
}

function Row({
  depth,
  open,
  hasChildren,
  onToggle,
  children,
}: {
  depth: number;
  open?: boolean;
  hasChildren?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  const clickable = hasChildren && onToggle;
  return (
    <div
      className={clickable ? 'row row--clickable' : 'row'}
      onClick={clickable ? onToggle : undefined}
      style={{ paddingLeft: 8 + depth * INDENT }}
    >
      <Caret open={!!open} hasChildren={!!hasChildren} />
      {children}
    </div>
  );
}

function unitMatches(u: UnitNode, q: string): boolean {
  return [u.address, u.name, u.type, u.category, ...u.applications, ...u.groups]
    .some((v) => v != null && String(v).toLowerCase().includes(q));
}

function groupMatches(g: GroupNode, q: string): boolean {
  return [g.address, g.group, g.label].some((v) => v != null && String(v).toLowerCase().includes(q));
}

function appMatches(a: AppNode, q: string): boolean {
  if ([a.address, a.label].some((v) => v != null && String(v).toLowerCase().includes(q))) return true;
  return a.groups.some((g) => groupMatches(g, q));
}

export function DeviceTree({
  tree,
  states,
  actions,
  projectName,
}: {
  tree: Tree;
  states: Record<string, GroupState>;
  actions?: GroupActions;
  projectName?: string | null;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');
  const q = filter.trim().toLowerCase();
  const filtering = q.length > 0;

  // With per-node defaults, track an override map and fall back to `def`.
  const isOpen = (key: string, def: boolean) => (filtering ? true : key in open ? open[key] : def);
  const toggle = (key: string, def: boolean) =>
    setOpen((prev) => ({ ...prev, [key]: !(key in prev ? prev[key] : def) }));

  const totalUnits = useMemo(() => tree.reduce((n, net) => n + (net.units?.length ?? 0), 0), [tree]);

  if (tree.length === 0) {
    return (
      <div className="empty">
        <div className="empty__mark" aria-hidden>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <rect x="3" y="4" width="18" height="14" rx="2" />
            <path d="M8 20h8M12 18v2" />
          </svg>
        </div>
        <strong style={{ color: 'var(--text-2)', fontWeight: 600 }}>Not connected.</strong>
        <span>Choose a site and connect to browse the network.</span>
      </div>
    );
  }

  return (
    <div className="tree">
      <input
        className="filter"
        aria-label="Filter"
        placeholder={`Filter ${totalUnits} devices, applications, groups\u2026`}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      {tree.map((net) => (
        <NetworkBlock
          key={net.address}
          net={net}
          states={states}
          actions={actions}
          projectName={projectName}
          q={q}
          filtering={filtering}
          isOpen={isOpen}
          toggle={toggle}
        />
      ))}
    </div>
  );
}

function NetworkBlock({
  net,
  states,
  actions,
  projectName,
  q,
  filtering,
  isOpen,
  toggle,
}: {
  net: NetworkNode;
  states: Record<string, GroupState>;
  actions?: GroupActions;
  projectName?: string | null;
  q: string;
  filtering: boolean;
  isOpen: (k: string, d: boolean) => boolean;
  toggle: (k: string, d: boolean) => void;
}) {
  const units = net.units ?? [];
  const apps = net.applications ?? [];
  const shownUnits = filtering ? units.filter((u) => unitMatches(u, q)) : units;
  const shownApps = filtering ? apps.filter((a) => appMatches(a, q)) : apps;

  const netKey = `net:${net.address}`;
  const appsKey = `${netKey}:apps`;
  const unitsKey = `${netKey}:units`;
  const netOpen = isOpen(netKey, true);

  return (
    <div>
      <Row depth={0} open={netOpen} hasChildren onToggle={() => toggle(netKey, true)}>
        <strong className="row__net">Network {net.address}</strong>
        {(net.label || projectName) && (
          <span className="row__netName">{net.label || projectName}</span>
        )}
        <span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>
          {units.length} units &middot; {apps.length} applications
        </span>
      </Row>

      {netOpen && (
        <>
          {/* Applications → groups (with live state) */}
          <Section
            depth={1}
            label="Applications"
            count={shownApps.length}
            sectionKey={appsKey}
            isOpen={isOpen}
            toggle={toggle}
            empty="No applications."
          >
            {shownApps.map((app) => {
              const appKey = `${appsKey}:${app.address}`;
              const groups = filtering ? app.groups.filter((g) => groupMatches(g, q)) : app.groups;
              const appOpen = isOpen(appKey, true);
              return (
                <div key={app.address}>
                  <Row depth={2} open={appOpen} hasChildren={groups.length > 0} onToggle={() => toggle(appKey, true)}>
                    <span>
                      <strong className="row__addr">{app.address}</strong>
                      {app.label && <span> &mdash; {app.label}</span>}
                    </span>
                    <span className="muted" style={{ marginLeft: 'auto', fontSize: 12 }}>{groups.length} groups</span>
                  </Row>
                  {appOpen &&
                    groups.map((g) => (
                      <Row key={g.address} depth={3}>
                        <GroupRow group={g} state={states[g.address]} actions={actions} />
                      </Row>
                    ))}
                </div>
              );
            })}
          </Section>

          {/* Physical units (devices) */}
          <Section
            depth={1}
            label="Units"
            count={shownUnits.length}
            sectionKey={unitsKey}
            isOpen={isOpen}
            toggle={toggle}
            empty="No units."
          >
            {shownUnits.map((u) => {
              const uKey = `${unitsKey}:${u.address}`;
              const uOpen = isOpen(uKey, false);
              return (
                <div key={u.address}>
                  <Row depth={2} open={uOpen} hasChildren onToggle={() => toggle(uKey, false)}>
                    <span className="row__addr" style={{ minWidth: 32 }}>
                      <strong>{u.address}</strong>
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>{u.name ?? <span className="muted">(unnamed)</span>}</span>
                    {u.category && <span className="tag">{u.category}</span>}
                    {u.type && <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{u.type}</span>}
                  </Row>
                  {uOpen && (
                    <div style={{ paddingLeft: 8 + 3 * INDENT, paddingBottom: 6 }}>
                      <UnitDetail label="Type" value={u.type} />
                      <UnitDetail label="Firmware" value={u.firmware} />
                      <UnitDetail label="Serial" value={u.serial} />
                      <UnitDetail label="Applications" value={u.applications.join(', ') || null} />
                      <UnitDetail label="Groups" value={u.groups.join(', ') || null} />
                    </div>
                  )}
                </div>
              );
            })}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  depth,
  label,
  count,
  sectionKey,
  isOpen,
  toggle,
  empty,
  children,
}: {
  depth: number;
  label: string;
  count: number;
  sectionKey: string;
  isOpen: (k: string, d: boolean) => boolean;
  toggle: (k: string, d: boolean) => void;
  empty: string;
  children: React.ReactNode;
}) {
  const sectionOpen = isOpen(sectionKey, true);
  return (
    <div>
      <Row depth={depth} open={sectionOpen} hasChildren onToggle={() => toggle(sectionKey, true)}>
        <span className="section__label">{label}</span>
        <span className="muted">{count}</span>
      </Row>
      {sectionOpen && (count > 0 ? children : <Row depth={depth + 1}><span className="muted">{empty}</span></Row>)}
    </div>
  );
}

function UnitDetail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="unitDetail">
      <span className="unitDetail__key">{label}</span>
      <span className="unitDetail__val">{value ?? '\u2014'}</span>
    </div>
  );
}
