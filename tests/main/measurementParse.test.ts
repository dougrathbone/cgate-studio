import { parseMeasurementEvent } from '../../src/main/measurementParse';

describe('parseMeasurementEvent', () => {
  it('parses a measurement line with a value and units', () => {
    const m = parseMeasurementEvent('measurement 254/228/1 25.5 units=2');
    expect(m).toEqual({
      address: '254/228/1', network: '254', application: '228',
      channel: '1', value: 25.5, units: '2',
    });
  });

  it('parses a measurement line with no units', () => {
    const m = parseMeasurementEvent('measurement 254/228/3 60');
    expect(m).toEqual({
      address: '254/228/3', network: '254', application: '228',
      channel: '3', value: 60, units: null,
    });
  });

  it('strips a //PROJECT/ prefix from the address', () => {
    const m = parseMeasurementEvent('measurement //HOME/254/228/1 18.25 units=degC');
    expect(m?.address).toBe('254/228/1');
    expect(m?.units).toBe('degC');
  });

  it('returns null for a non-measurement line', () => {
    expect(parseMeasurementEvent('lighting on 254/56/4')).toBeNull();
    expect(parseMeasurementEvent('')).toBeNull();
    expect(parseMeasurementEvent('measurement garbage')).toBeNull();
  });
});
