import { useEffect, useRef, type RefObject } from 'react';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return el.isContentEditable;
}

/** Focus the filter when `/` is pressed outside an input; Escape clears when filter is focused. */
export function useFilterHotkeys(filterRef: RefObject<HTMLInputElement | null>, setFilter: (v: string) => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey && !isTypingTarget(e.target)) {
        e.preventDefault();
        filterRef.current?.focus();
        filterRef.current?.select();
        return;
      }
      if (e.key === 'Escape' && e.target === filterRef.current) {
        e.preventDefault();
        setFilter('');
        filterRef.current?.blur();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filterRef, setFilter]);
}

export function useFilterRef() {
  return useRef<HTMLInputElement>(null);
}
