import React, { useEffect, useState } from 'react';
import { cgate } from '../api';
import type { GroupActions } from './GroupRow';
import type { GroupNode, GroupState, TreeSelection, CgateObjectParams } from '../../shared/types';

const refOf = (g: GroupNode) => ({ network: g.network, application: g.application, group: g.group });
const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

const GROUP_EDITABLE = ['Name', 'RampTime', 'EventLevel', 'Protected'] as const;
const GROUP_READONLY = ['Type', 'State', 'Units', 'Level'] as const;

function ParamRow({
  label,
  value,
  editable,
  onChange,
  onCommit,
}: {
  label: string;
  value: string;
  editable?: boolean;
  onChange?: (v: string) => void;
  onCommit?: () => void;
}) {
  return (
    <div className="entityPanel__param">
      <label className="entityPanel__paramKey">{label}</label>
      {editable ? (
        <input
          className="entityPanel__input"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => { if (e.key === 'Enter') onCommit?.(); }}
        />
      ) : (
        <span className="entityPanel__paramVal">{value || '—'}</span>
      )}
    </div>
  );
}

export function EntityPanel({
  selection,
  state,
  actions,
  connected,
  onGroupRenamed,
  onUnitRenamed,
  onError,
  onClose,
}: {
  selection: TreeSelection;
  state?: GroupState;
  actions?: GroupActions;
  connected: boolean;
  onGroupRenamed: (group: GroupNode, name: string) => void;
  onUnitRenamed: (network: string, unitAddress: string, name: string) => void;
  onError: (msg: string) => void;
  onClose: () => void;
}) {
  const [params, setParams] = useState<CgateObjectParams | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setParams(null);
    (async () => {
      try {
        let p: CgateObjectParams;
        if (selection.kind === 'group') {
          p = await cgate().nodes.getGroupParams(refOf(selection.group));
        } else {
          p = await cgate().nodes.getUnitParams(selection.network, selection.unit.address);
        }
        if (!cancelled) {
          setParams(p);
          setDraft(
            selection.kind === 'group' && !p.Name && selection.group.label
              ? { ...p, Name: selection.group.label }
              : { ...p },
          );
        }
      } catch (e) {
        if (!cancelled) onError(errMsg(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selection]);

  async function commitParam(key: string) {
    if (!connected || draft[key] === params?.[key]) return;
    try {
      if (selection.kind === 'group') {
        if (key === 'Name') {
          await cgate().labels.rename(refOf(selection.group), draft[key]);
          onGroupRenamed(selection.group, draft[key]);
        } else {
          await cgate().nodes.setGroupParam(refOf(selection.group), key, draft[key]);
        }
      } else if (key === 'Name') {
        await cgate().nodes.setUnitName(selection.network, selection.unit.address, draft[key]);
        onUnitRenamed(selection.network, selection.unit.address, draft[key]);
      }
      setParams((prev) => ({ ...prev, [key]: draft[key] }));
    } catch (e) {
      onError(errMsg(e));
      setDraft((d) => ({ ...d, [key]: params?.[key] ?? '' }));
    }
  }

  const title = selection.kind === 'group'
    ? `Group ${selection.group.address}`
    : `Unit ${selection.unit.address}`;

  const subtitle = selection.kind === 'group'
    ? (selection.group.label ?? '(unlabelled)')
    : (selection.unit.name ?? '(unnamed)');

  const readonlyKeys = selection.kind === 'group' ? [...GROUP_READONLY] : [];
  const editableKeys: string[] = selection.kind === 'group'
    ? (connected ? [...GROUP_EDITABLE] : [])
    : (connected ? ['Name'] : []);

  const extraReadonly = Object.keys(params ?? {}).filter((k) => {
    if (selection.kind === 'group') {
      return !GROUP_EDITABLE.includes(k as typeof GROUP_EDITABLE[number])
        && !GROUP_READONLY.includes(k as typeof GROUP_READONLY[number]);
    }
    return k !== 'Name';
  }).sort();

  return (
    <aside className="entityPanel" aria-label="Entity details">
      <header className="entityPanel__header">
        <div>
          <h2 className="entityPanel__title">{title}</h2>
          <p className="entityPanel__subtitle">{subtitle}</p>
        </div>
        <button type="button" className="btn btn--ghost btn--sm btn--icon" onClick={onClose} aria-label="Close">
          ×
        </button>
      </header>

      {loading && <p className="entityPanel__loading">Loading parameters…</p>}

      {!loading && params && (
        <>
          {selection.kind === 'group' && actions && (
            <section className="entityPanel__section">
              <h3 className="entityPanel__sectionTitle">Live control</h3>
              <div className="entityPanel__live">
                <button
                  type="button"
                  className={state?.on ? 'btn btn--sm toggle toggle--on' : 'btn btn--sm toggle'}
                  onClick={() => actions.setLevel(selection.group, state?.on ? 0 : 255)}
                >
                  {state?.on ? 'Off' : 'On'}
                </button>
                <input
                  type="range"
                  className="slider"
                  min={0}
                  max={100}
                  value={state ? Math.round((state.level / 255) * 100) : 0}
                  aria-label="Level"
                  onChange={(e) => {
                    const level = Math.round((Number(e.target.value) / 100) * 255);
                    actions.setLevel(selection.group, level);
                  }}
                />
              </div>
            </section>
          )}

          <section className="entityPanel__section">
            <h3 className="entityPanel__sectionTitle">Settings</h3>
            {editableKeys.map((key) => (
              <ParamRow
                key={key}
                label={key}
                value={draft[key] ?? ''}
                editable={connected}
                onChange={(v) => setDraft((d) => ({ ...d, [key]: v }))}
                onCommit={() => void commitParam(key)}
              />
            ))}
            {readonlyKeys.map((key) => (
              <ParamRow
                key={key}
                label={key}
                value={
                  key === 'Level' && state != null
                    ? String(state.level)
                    : (params[key] ?? '')
                }
              />
            ))}
            {selection.kind === 'unit' && extraReadonly.map((key) => (
              <ParamRow key={key} label={key} value={params[key] ?? ''} />
            ))}
            {selection.kind === 'group' && extraReadonly.map((key) => (
              <ParamRow key={key} label={key} value={params[key] ?? ''} />
            ))}
          </section>

          {selection.kind === 'unit' && (
            <p className="entityPanel__hint">
              Other unit parameters are configured in C-Bus Toolkit. Only the unit name can be changed here.
            </p>
          )}
        </>
      )}
    </aside>
  );
}
