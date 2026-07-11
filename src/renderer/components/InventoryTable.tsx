import React, { useMemo, useState } from 'react';
import type { Tree, UnitNode, TreeSelection } from '../../shared/types';
import { useFilterHotkeys, useFilterRef } from '../hooks/useFilterHotkeys';

function collectUnits(tree: Tree): { network: string; unit: UnitNode }[] {
  const out: { network: string; unit: UnitNode }[] = [];
  for (const net of tree) {
    for (const u of net.units ?? []) out.push({ network: net.address, unit: u });
  }
  return out;
}

function matches(u: UnitNode, network: string, q: string): boolean {
  if (!q) return true;
  const hay = [
    u.address, u.name, u.type, u.category, u.firmware, u.serial, network,
    ...(u.applications ?? []), ...(u.groups ?? []),
  ].filter(Boolean).join(' ').toLowerCase();
  return hay.includes(q);
}

export function InventoryTable({
  tree,
  selection,
  onSelect,
}: {
  tree: Tree;
  selection?: TreeSelection | null;
  onSelect?: (sel: TreeSelection) => void;
}) {
  const [filter, setFilter] = useState('');
  const filterRef = useFilterRef();
  useFilterHotkeys(filterRef, setFilter);
  const q = filter.trim().toLowerCase();
  const rows = useMemo(
    () => collectUnits(tree).filter(({ network, unit }) => matches(unit, network, q)),
    [tree, q],
  );

  const selectedKey = selection?.kind === 'unit'
    ? `${selection.network}:${selection.unit.address}`
    : null;

  return (
    <div className="commTable">
      <div className="commTable__toolbar">
        <input
          ref={filterRef}
          className="filter"
          type="search"
          placeholder={`Filter ${rows.length} units…`}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Filter units"
        />
      </div>
      {rows.length === 0 ? (
        <p className="commTable__empty">No units to show.</p>
      ) : (
        <div className="commTable__scroll">
          <table className="commTable__table">
            <thead>
              <tr>
                <th>Addr</th>
                <th>Name</th>
                <th>Type</th>
                <th>Firmware</th>
                <th>Serial</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ network, unit }) => {
                const key = `${network}:${unit.address}`;
                const selected = selectedKey === key;
                return (
                  <tr
                    key={key}
                    className={selected ? 'commTable__row--selected' : undefined}
                    onClick={() => onSelect?.({ kind: 'unit', network, unit })}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect?.({ kind: 'unit', network, unit });
                      }
                    }}
                  >
                    <td className="commTable__mono">{unit.address}</td>
                    <td>{unit.name ?? '—'}</td>
                    <td className="commTable__mono">{unit.type ?? '—'}</td>
                    <td className="commTable__mono">{unit.firmware ?? '—'}</td>
                    <td className="commTable__mono">{unit.serial ?? '—'}</td>
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
