import React, { useEffect, useRef } from 'react';
import type { ActivityEntry } from '../../shared/types';

export function ActivityDrawer({
  open,
  entries,
  onClose,
}: {
  open: boolean;
  entries: ActivityEntry[];
  onClose: () => void;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: 'end' });
  }, [open, entries.length]);

  if (!open) return null;

  return (
    <aside className="activityDrawer" aria-label="C-Gate activity">
      <div className="activityDrawer__head">
        <strong>Activity</strong>
        <button type="button" className="btn btn--sm btn--ghost" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="activityDrawer__body">
        {entries.length === 0 && (
          <p className="activityDrawer__empty">Commands will appear here as you use the session.</p>
        )}
        {entries.map((e) => (
          <div key={e.id} className={`activityLine activityLine--${e.direction}`}>
            <span className="activityLine__dir">{e.direction}</span>
            <span className="activityLine__text">{e.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </aside>
  );
}
