/**
 * Compute next index for ArrowUp/Down navigation in a filtered list.
 * Returns -1 if the list is empty.
 */
export function nextFilterIndex(
  length: number,
  currentIndex: number,
  direction: 'up' | 'down',
): number {
  if (length <= 0) return -1;
  if (currentIndex < 0) return direction === 'down' ? 0 : length - 1;
  if (direction === 'down') return Math.min(length - 1, currentIndex + 1);
  return Math.max(0, currentIndex - 1);
}
