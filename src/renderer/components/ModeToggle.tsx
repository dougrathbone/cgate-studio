import React from 'react';
import type { UiMode } from '../../shared/types';

const MODES: { id: UiMode; label: string }[] = [
  { id: 'operate', label: 'Operate' },
  { id: 'commission', label: 'Commission' },
];

export function ModeToggle({
  mode,
  onChange,
  disabled,
}: {
  mode: UiMode;
  onChange: (mode: UiMode) => void;
  disabled?: boolean;
}) {
  return (
    <div className="modeToggle" role="tablist" aria-label="Workspace mode">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          role="tab"
          aria-selected={mode === m.id}
          className={`modeToggle__btn${mode === m.id ? ' modeToggle__btn--active' : ''}`}
          disabled={disabled}
          onClick={() => onChange(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
