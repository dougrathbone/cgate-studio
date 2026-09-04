import React, { useMemo, useState } from 'react';
import type { Tree, UnitNode, TreeSelection } from '../../shared/types';
import { formatUnitType } from '../../shared/displayLabels';
import { nextFilterIndex } from '../../shared/filterNav';
import { cgate } from '../api';
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

type ParamOverride = { serial?: string | null; firmware?: string | null };

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
  const [paramOverrides, setParamOverrides] = useState<Record<string, ParamOverride>>({});
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
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

  function moveSelection(direction: 'up' | 'down') {
    if (!onSelect || rows.length === 0) return;
    const current = selectedKey
      ? rows.findIndex(({ network, unit }) => `${network}:${unit.address}` === selectedKey)
      : -1;
    const next = nextFilterIndex(rows.length, current, direction);
    if (next < 0) return;
    const { network, unit } = rows[next];
    onSelect({ kind: 'unit', network, unit });
  }

  async function refreshParams() {
    const all = collectUnits(tree);
    if (all.length === 0) return;
    setRefreshBusy(true);
    setRefreshError(null);
    const next: Record<string, ParamOverride> = { ...paramOverrides };
    try {
      const concurrency = 3;
      let i = 0;
      async function worker() {
        while (i < all.length) {
          const idx = i++;
          const { network, unit } = all[idx];
          const key = `${network}:${unit.address}`;
          try {
            const p = await cgate().nodes.getUnitParams(network, unit.address);
            next[key] = {
              serial: p.Serial ?? p.SerialNo ?? unit.serial,
              firmware: p.Firmware ?? p.Version ?? unit.firmware,
            };
          } catch {
            /* keep existing / tree values for this unit */
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, all.length) }, () => worker()));
      setParamOverrides({ ...next });
    } catch (e) {
      setRefreshError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshBusy(false);
    }
  }

  return (
    <div className="commTable">
      <div className="commTable__toolbar">
        <input
          ref={filterRef}
          className="filter"
          type="search"
          placeholder={`Filter ${rows.length} units… (/ to focus)`}
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
          aria-label="Filter units"
        />
        <div className="commTable__actions">
          <button
            type="button"
            className="btn btn--sm"
            disabled={refreshBusy || collectUnits(tree).length === 0}
            onClick={() => void refreshParams()}
            title="Fetch Serial/Firmware via GET (does not dirty the project)"
          >
            {refreshBusy ? 'Refreshing…' : 'Refresh params'}
          </button>
        </div>
      </div>
      {refreshError && <p className="commTable__empty" role="alert">{refreshError}</p>}
      {rows.length === 0 ? (
        <p className="commTable__empty">{filter.trim() ? 'No matches.' : 'No units to show.'}</p>
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
                const over = paramOverrides[key];
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
                    <td className="commTable__mono">{formatUnitType(unit.type, unit.category)}</td>
                    <td className="commTable__mono">{over?.firmware ?? unit.firmware ?? '—'}</td>
                    <td className="commTable__mono">{over?.serial ?? unit.serial ?? '—'}</td>
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
