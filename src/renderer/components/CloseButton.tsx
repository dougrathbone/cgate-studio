import React from 'react';

/** Square dismiss control with a centered stroke X (not a text glyph). */
export function CloseButton({
  onClick,
  label = 'Close',
  className,
}: {
  onClick: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`closeBtn${className ? ` ${className}` : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path
          d="M3 3l8 8M11 3L3 11"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
