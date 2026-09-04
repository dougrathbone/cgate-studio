/** Pure mismatch helpers for Commission cues (M14). */

export function tagNameMismatch(
  tag: string | null | undefined,
  objectName: string | null | undefined,
): boolean {
  const t = (tag ?? '').trim();
  const n = (objectName ?? '').trim();
  if (!t || !n) return false;
  return t !== n;
}
