import React, { useMemo, useState } from 'react';
import type { Tree, NetworkNode, AppNode, GroupNode, UnitNode, GroupState, TreeSelection, MeasurementState } from '../../shared/types';
import { GroupRow, GroupActions } from './GroupRow';
import { useFilterHotkeys, useFilterRef } from '../hooks/useFilterHotkeys';

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
  onSelect,
  selected,
  children,
}: {
  depth: number;
  open?: boolean;
  hasChildren?: boolean;
  onToggle?: () => void;
  onSelect?: () => void;
  selected?: boolean;
  children: React.ReactNode;
}) {
  const expandable = hasChildren && onToggle;
  const handleRowClick = () => {
    if (onSelect) onSelect();
    else if (expandable) onToggle?.();
  };
  return (
    <div
      className={`row${selected ? ' row--selected' : ''}${onSelect || expandable ? ' row--clickable' : ''}`}
      style={{ paddingLeft: 8 + depth * INDENT }}
      onClick={handleRowClick}
      role={onSelect ? 'button' : expandable ? 'button' : undefined}
      tabIndex={onSelect || expandable ? 0 : undefined}
      onKeyDown={onSelect || expandable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRowClick(); }
      } : undefined}
    >
      <span
        className="row__caretWrap"
        onClick={expandable ? (e) => { e.stopPropagation(); onToggle(); } : undefined}
        aria-hidden={!expandable}
      >
        <Caret open={!!open} hasChildren={!!hasChildren} />
      </span>
      <span className="row__body">{children}</span>
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

export function selectionId(sel: TreeSelection): string {
  return sel.kind === 'group' ? `g:${sel.group.address}` : `u:${sel.network}:${sel.unit.address}`;
}

export function DeviceTree({
  tree,
  states,
  measurements,
  actions,
  projectName,
  connected = false,
  selection,
  onSelect,
}: {
  tree: Tree;
  states: Record<string, GroupState>;
  measurements?: Record<string, MeasurementState>;
  actions?: GroupActions;
  projectName?: string | null;
  /** True when the C-Gate TCP session is up (tree may still be empty). */
  connected?: boolean;
  selection?: TreeSelection | null;
  onSelect?: (sel: TreeSelection) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');
  const filterRef = useFilterRef();
  useFilterHotkeys(filterRef, setFilter);
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
        {connected ? (
          <>
            <strong style={{ color: 'var(--text-2)', fontWeight: 600 }}>Connected — no tree yet.</strong>
            <span>
              {projectName
                ? `Project “${projectName}” is active, but no network tree was loaded. Pick a network in the header, or use Open / Sync on the status bar.`
                : 'C-Gate is reachable, but no project is loaded. Load or start a project in C-Gate (or Toolkit), then choose it from the Project menu.'}
            </span>
          </>
        ) : (
          <>
            <strong style={{ color: 'var(--text-2)', fontWeight: 600 }}>Not connected.</strong>
            <span>Choose a site and connect to browse the network.</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="tree">
      <input
        ref={filterRef}
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
          measurements={measurements}
          actions={actions}
          projectName={projectName}
          q={q}
          filtering={filtering}
          isOpen={isOpen}
          toggle={toggle}
          selection={selection}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function NetworkBlock({
  net,
  states,
  measurements = {},
  actions,
  projectName,
  q,
  filtering,
  isOpen,
  toggle,
  selection,
  onSelect,
}: {
  net: NetworkNode;
  states: Record<string, GroupState>;
  measurements?: Record<string, MeasurementState>;
  actions?: GroupActions;
  projectName?: string | null;
  q: string;
  filtering: boolean;
  isOpen: (k: string, d: boolean) => boolean;
  toggle: (k: string, d: boolean) => void;
  selection?: TreeSelection | null;
  onSelect?: (sel: TreeSelection) => void;
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
                      <Row
                        key={g.address}
                        depth={3}
                        selected={selection != null && selectionId(selection) === `g:${g.address}`}
                        onSelect={onSelect ? () => onSelect({ kind: 'group', group: g }) : undefined}
                      >
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
                  <Row
                    depth={2}
                    open={uOpen}
                    hasChildren
                    onToggle={() => toggle(uKey, false)}
                    selected={selection != null && selectionId(selection) === `u:${net.address}:${u.address}`}
                    onSelect={onSelect ? () => onSelect({ kind: 'unit', network: net.address, unit: u }) : undefined}
                  >
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

          {/* Sensors (Measurement application 228) — read-only */}
          {(() => {
            const sensorEntries = Object.values(measurements).filter((m) => m.network === net.address);
            if (sensorEntries.length === 0) return null;
            return (
              <Section depth={1} label="Sensors" count={sensorEntries.length} sectionKey={`${net.address}:sensors`} isOpen={isOpen} toggle={toggle} empty="No sensors.">
                {sensorEntries
                  .sort((a, b) => a.address.localeCompare(b.address))
                  .map((m) => (
                    <Row key={m.address} depth={2}>
                      <span className="row__addr"><strong>{m.address}</strong></span>
                      <span style={{ marginLeft: 'auto' }}>
                        {m.value}{m.units ? ` (units ${m.units})` : ''}
                      </span>
                    </Row>
                  ))}
              </Section>
            );
          })()}
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
