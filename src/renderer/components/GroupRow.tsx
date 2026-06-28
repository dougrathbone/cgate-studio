import React, { useRef, useState } from 'react';
import type { GroupNode, GroupState } from '../../shared/types';
import { StateBadge } from './StateBadge';

// Actions a group row can perform. Provided by App when connected; absent in
// read-only (disconnected) mode.
export interface GroupActions {
  setLevel: (group: GroupNode, level: number, rampSecs?: number) => void;
  terminateRamp: (group: GroupNode) => void;
  rename: (group: GroupNode, name: string) => void;
  fireScene: (group: GroupNode, actionSelector: number) => void;
}

const RAMP_MAX = 255;

export function GroupRow({
  group,
  state,
  actions,
}: {
  group: GroupNode;
  state?: GroupState;
  actions?: GroupActions;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(group.label ?? '');
  // Guards against a double submit: pressing Enter sets editing=false, which
  // removes the input and can fire its onBlur -> a second submitRename.
  const submitting = useRef(false);
  const isTrigger = group.application === '202';
  const [selector, setSelector] = useState(0);
  const on = state?.on ?? false;
  const pct = state ? Math.round((state.level / RAMP_MAX) * 100) : 0;

  const startEditing = () => { setDraft(group.label ?? ''); submitting.current = false; setEditing(true); };

  const submitRename = () => {
    if (submitting.current) return;
    submitting.current = true;
    setEditing(false);
    const next = draft.trim();
    if (actions && next !== (group.label ?? '')) actions.rename(group, next);
  };

  const cancelEditing = () => { submitting.current = true; setEditing(false); setDraft(group.label ?? ''); };

  return (
    <div className="group">
      <span className="group__addr">{group.address}</span>

      {editing ? (
        <input
          className="group__rename"
          aria-label={`Rename ${group.address}`}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitRename();
            if (e.key === 'Escape') cancelEditing();
          }}
          onBlur={submitRename}
        />
      ) : (
        <span className="group__label">
          {group.label ?? <span className="muted">(unlabelled)</span>}
        </span>
      )}

      {!isTrigger && <StateBadge state={state} />}

      {actions && !editing && isTrigger && (
        <span className="group__controls" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <input
            type="number"
            min={0}
            max={255}
            className="input input--sm"
            aria-label={`Action selector for ${group.address}`}
            value={selector}
            onChange={(e) => setSelector(Number(e.target.value))}
          />
          <button
            type="button"
            className="btn btn--sm"
            aria-label={`Fire scene ${group.address}`}
            onClick={() => actions.fireScene(group, selector)}
          >
            Fire
          </button>
        </span>
      )}
      {actions && !editing && !isTrigger && (
        <span className="group__controls" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={on ? 'btn btn--sm toggle toggle--on' : 'btn btn--sm toggle'}
            aria-label={`${on ? 'Turn off' : 'Turn on'} ${group.address}`}
            onClick={() => actions.setLevel(group, on ? 0 : RAMP_MAX)}
          >
            {on ? 'Off' : 'On'}
          </button>
          <input
            type="range"
            className="slider"
            min={0}
            max={100}
            value={pct}
            aria-label={`Level ${group.address}`}
            title={`${pct}%`}
            onChange={(e) => {
              const level = Math.round((Number(e.target.value) / 100) * RAMP_MAX);
              actions.setLevel(group, level);
            }}
          />
          {state?.ramping && (
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              aria-label={`Stop ramp ${group.address}`}
              onClick={() => actions.terminateRamp(group)}
            >
              Stop
            </button>
          )}
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            aria-label={`Edit label ${group.address}`}
            onClick={startEditing}
          >
            Rename
          </button>
        </span>
      )}
    </div>
  );
}
