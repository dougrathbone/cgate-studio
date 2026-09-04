import React, { useMemo, useState } from 'react';
import type { GroupNode, GroupState, TreeSelection } from '../../shared/types';
import { nextFilterIndex } from '../../shared/filterNav';
import { useFilterHotkeys, useFilterRef } from '../hooks/useFilterHotkeys';

function matches(g: GroupNode, q: string): boolean {
  if (!q) return true;
  const hay = [g.address, g.label, g.network, g.application, g.group]
    .filter(Boolean).join(' ').toLowerCase();
  return hay.includes(q);
}

export function GroupsWorkspace({
  groups,
  states,
  selection,
  onSelect,
  onBulkSetLevel,
  onClearLabels,
  bulkBusy,
}: {
  groups: GroupNode[];
  states: Record<string, GroupState>;
  selection?: TreeSelection | null;
  onSelect?: (sel: TreeSelection) => void;
  onBulkSetLevel?: (groups: GroupNode[], level: number) => void | Promise<void>;
  onClearLabels?: (groups: GroupNode[]) => void | Promise<void>;
  bulkBusy?: boolean;
}) {
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const filterRef = useFilterRef();
  useFilterHotkeys(filterRef, setFilter);
  const q = filter.trim().toLowerCase();
  const rows = useMemo(() => groups.filter((g) => matches(g, q)), [groups, q]);

  const selectedKey = selection?.kind === 'group' ? selection.group.address : null;
  const selectedGroups = rows.filter((g) => selected.has(g.address));
  const allVisibleSelected = rows.length > 0 && rows.every((g) => selected.has(g.address));

  function moveSelection(direction: 'up' | 'down') {
    if (!onSelect || rows.length === 0) return;
    const current = selectedKey ? rows.findIndex((g) => g.address === selectedKey) : -1;
    const next = nextFilterIndex(rows.length, current, direction);
    if (next < 0) return;
    onSelect({ kind: 'group', group: rows[next] });
  }

  function toggleOne(address: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(address)) next.delete(address);
      else next.add(address);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((prev) => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const g of rows) next.delete(g.address);
        return next;
      }
      const next = new Set(prev);
      for (const g of rows) next.add(g.address);
      return next;
    });
  }

  return (
    <div className="commTable">
      <div className="commTable__toolbar">
        <input
          ref={filterRef}
          className="filter"
          type="search"
          placeholder={`Filter ${rows.length} groups… (/ to focus)`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              moveSelection('down');
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              moveSelection('up');
            }
          }}
          aria-label="Filter groups"
        />
        <div className="commTable__actions">
          <button
            type="button"
            className="btn btn--sm"
            disabled={bulkBusy || selectedGroups.length === 0 || !onBulkSetLevel}
            onClick={() => void onBulkSetLevel?.(selectedGroups, 255)}
          >
            On
          </button>
          <button
            type="button"
            className="btn btn--sm"
            disabled={bulkBusy || selectedGroups.length === 0 || !onBulkSetLevel}
            onClick={() => void onBulkSetLevel?.(selectedGroups, 0)}
          >
            Off
          </button>
          <button
            type="button"
            className="btn btn--sm"
            disabled={bulkBusy || selectedGroups.length === 0 || !onBulkSetLevel}
            onClick={() => void onBulkSetLevel?.(selectedGroups, 128)}
            title="Set selected groups to 50%"
          >
            50%
          </button>
          <button
            type="button"
            className="btn btn--sm"
            disabled={bulkBusy || selectedGroups.length === 0 || !onClearLabels}
            onClick={() => {
              const n = selectedGroups.length;
              const ok = window.confirm(
                n === 1
                  ? `Clear the project label for ${selectedGroups[0].address}? This marks the TagName as unused until you save.`
                  : `Clear project labels for ${n} groups? This marks their TagNames as unused until you save.`,
              );
              if (ok) void onClearLabels?.(selectedGroups);
            }}
            title="Soft-delete TagName (mark as unused)"
          >
            Clear label
          </button>
          {selectedGroups.length > 0 && (
            <span className="commTable__selCount">{selectedGroups.length} selected</span>
          )}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="commTable__empty">{filter.trim() ? 'No matches.' : 'No groups to show.'}</p>
      ) : (
        <div className="commTable__scroll">
          <table className="commTable__table">
            <thead>
              <tr>
                <th className="commTable__check">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    aria-label="Select all visible groups"
                  />
                </th>
                <th>Address</th>
                <th>Label</th>
                <th>App</th>
                <th>Level</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => {
                const st = states[g.address];
                const rowSelected = selectedKey === g.address;
                return (
                  <tr
                    key={g.address}
                    className={rowSelected ? 'commTable__row--selected' : undefined}
                    onClick={() => onSelect?.({ kind: 'group', group: g })}
                  >
                    <td className="commTable__check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(g.address)}
                        onChange={() => toggleOne(g.address)}
                        aria-label={`Select ${g.address}`}
                      />
                    </td>
                    <td className="commTable__mono">{g.address}</td>
                    <td>{g.label ?? '—'}</td>
                    <td className="commTable__mono">{g.application}</td>
                    <td className="commTable__mono">
                      {st ? `${st.level}${st.on ? '' : ' off'}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
