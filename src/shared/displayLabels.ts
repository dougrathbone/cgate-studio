/** Display helpers for Operate mode (M13). Unknown codes pass through unchanged. */

/**
 * Prefer tree category from TREEXML (`deviceCategory`) plus the raw catalogue code.
 * Example: type KEYGL5, category Switch → "Switch (KEYGL5)".
 */
export function formatUnitType(
  type: string | null | undefined,
  category?: string | null,
): string {
  const code = (type ?? '').trim();
  if (!code) return '—';
  const cat = (category ?? '').trim();
  return cat ? `${cat} (${code})` : code;
}

/** Clipsal Measurement app units= tokens → short labels. Unknown → raw token. */
const MEASUREMENT_UNIT_LABELS: Record<string, string> = {
  '2': '°C',
  degc: '°C',
  '°c': '°C',
  c: '°C',
  '1': '%',
  '%': '%',
  percent: '%',
  '0': '',
};

export function formatMeasurementUnit(raw: string | null | undefined): string {
  if (raw == null) return '';
  const token = String(raw).trim();
  if (!token) return '';
  const mapped = MEASUREMENT_UNIT_LABELS[token] ?? MEASUREMENT_UNIT_LABELS[token.toLowerCase()];
  if (mapped === '') return '';
  return mapped ?? token;
}

/** Sensor value line: `25.5 °C` or `25.5` or `25.5 (units 99)`. */
export function formatMeasurementValue(value: number, units: string | null | undefined): string {
  if (units == null || String(units).trim() === '') return String(value);
  const token = String(units).trim();
  const mapped = MEASUREMENT_UNIT_LABELS[token] ?? MEASUREMENT_UNIT_LABELS[token.toLowerCase()];
  if (mapped === '') return String(value);
  if (mapped) return `${value} ${mapped}`;
  return `${value} (units ${token})`;
}
