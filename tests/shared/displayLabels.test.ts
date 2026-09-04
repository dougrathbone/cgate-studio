import {
  formatUnitType,
  formatMeasurementUnit,
  formatMeasurementValue,
} from '../../src/shared/displayLabels';

describe('displayLabels (M13)', () => {
  it('formatUnitType uses category when present', () => {
    expect(formatUnitType('KEYGL5', 'Switch')).toBe('Switch (KEYGL5)');
    expect(formatUnitType('DIMDC8', 'Dimmer')).toBe('Dimmer (DIMDC8)');
  });

  it('formatUnitType passes through unknown types without category', () => {
    expect(formatUnitType('XYZ99')).toBe('XYZ99');
    expect(formatUnitType(null)).toBe('—');
    expect(formatUnitType('')).toBe('—');
  });

  it('formatMeasurementUnit maps known codes', () => {
    expect(formatMeasurementUnit('2')).toBe('°C');
    expect(formatMeasurementUnit('degC')).toBe('°C');
    expect(formatMeasurementUnit('1')).toBe('%');
    expect(formatMeasurementUnit('99')).toBe('99');
    expect(formatMeasurementUnit(null)).toBe('');
  });

  it('formatMeasurementValue renders friendly units', () => {
    expect(formatMeasurementValue(25.5, '2')).toBe('25.5 °C');
    expect(formatMeasurementValue(25.5, '99')).toBe('25.5 (units 99)');
    expect(formatMeasurementValue(25.5, null)).toBe('25.5');
  });
});
