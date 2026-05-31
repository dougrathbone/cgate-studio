import React, { useMemo, useState } from 'react';
import type { Tree, NetworkNode, AppNode, GroupNode, UnitNode, GroupState } from '../../shared/types';
import { StateBadge } from './StateBadge';

const INDENT = 18;
const muted: React.CSSProperties = { color: '#888', fontWeight: 400 };
const tag: React.CSSProperties = {
  fontSize: 11,
  color: '#555',
  background: '#eef1f5',
  border: '1px solid #dde2e9',
  borderRadius: 4,
  padding: '0 6px',
  lineHeight: '16px',
  whiteSpace: 'nowrap',
};

function Caret({ open, hasChildren }: { open: boolean; hasChildren: boolean }) {
  return (
    <span style={{ display: 'inline-block', width: 14, color: '#999', userSelect: 'none' }}>
      {hasChildren ? (open ? '\u25BE' : '\u25B8') : ''}
    </span>
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
      onClick={clickable ? onToggle : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '3px 6px',
        paddingLeft: 6 + depth * INDENT,
        borderRadius: 4,
        cursor: clickable ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f6f9')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
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

export function DeviceTree({ tree, states }: { tree: Tree; states: Record<string, GroupState> }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');
  const q = filter.trim().toLowerCase();
  const filtering = q.length > 0;

  // With per-node defaults, track an override map and fall back to `def`.
  const isOpen = (key: string, def: boolean) => (filtering ? true : key in open ? open[key] : def);
  const toggle = (key: string, def: boolean) =>
    setOpen((prev) => ({ ...prev, [key]: !(key in prev ? prev[key] : def) }));

  const totalUnits = useMemo(() => tree.reduce((n, net) => n + (net.units?.length ?? 0), 0), [tree]);

  if (tree.length === 0) return <p style={{ color: '#999' }}>Not connected.</p>;

  return (
    <div style={{ fontSize: 14 }}>
      <input
        aria-label="Filter"
        placeholder={`Filter ${totalUnits} devices, applications, groups\u2026`}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '6px 10px',
          marginBottom: 8,
          border: '1px solid #ccd2da',
          borderRadius: 6,
        }}
      />
      {tree.map((net) => (
        <NetworkBlock
          key={net.address}
          net={net}
          states={states}
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
  q,
  filtering,
  isOpen,
  toggle,
}: {
  net: NetworkNode;
  states: Record<string, GroupState>;
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
        <strong>Network {net.address}</strong>
        {net.label && <span style={muted}>{net.label}</span>}
        <span style={muted}>
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
                      <strong>{app.address}</strong>
                      {app.label && <span> &mdash; {app.label}</span>}
                    </span>
                    <span style={muted}>{groups.length} groups</span>
                  </Row>
                  {appOpen &&
                    groups.map((g) => (
                      <Row key={g.address} depth={3}>
                        <span style={{ minWidth: 120, fontVariantNumeric: 'tabular-nums' }}>{g.address}</span>
                        <span style={{ flex: 1 }}>{g.label ?? <span style={muted}>(unlabelled)</span>}</span>
                        <StateBadge state={states[g.address]} />
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
                    <span style={{ minWidth: 36, fontVariantNumeric: 'tabular-nums' }}>
                      <strong>{u.address}</strong>
                    </span>
                    <span style={{ flex: 1 }}>{u.name ?? <span style={muted}>(unnamed)</span>}</span>
                    {u.category && <span style={tag}>{u.category}</span>}
                    {u.type && <span style={muted}>{u.type}</span>}
                  </Row>
                  {uOpen && (
                    <div style={{ paddingLeft: 6 + 3 * INDENT, paddingBottom: 4, color: '#555', fontSize: 13 }}>
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
        <strong style={{ textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.4, color: '#666' }}>
          {label}
        </strong>
        <span style={muted}>{count}</span>
      </Row>
      {sectionOpen && (count > 0 ? children : <Row depth={depth + 1}><span style={muted}>{empty}</span></Row>)}
    </div>
  );
}

function UnitDetail({ label, value }: { label: string; value: string | null }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ minWidth: 96, color: '#888' }}>{label}</span>
      <span>{value ?? '\u2014'}</span>
    </div>
  );
}
