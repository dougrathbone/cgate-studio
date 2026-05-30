const CBusEvent = require('../../src/cgate-client/cbusEvent');

describe('vendored CBusEvent', () => {
  it('parses a lighting ramp event into components', () => {
    const e = new CBusEvent('lighting ramp 254/56/4 128');
    expect(e.isValid()).toBe(true);
    expect(e.getNetwork()).toBe('254');
    expect(e.getApplication()).toBe('56');
    expect(e.getGroup()).toBe('4');
    expect(e.getAction()).toBe('ramp');
    expect(e.getLevel()).toBe(128);
  });

  it('parses an on event with no level', () => {
    const e = new CBusEvent('lighting on 254/56/4');
    expect(e.isValid()).toBe(true);
    expect(e.getAction()).toBe('on');
  });

  it('marks unparseable input invalid', () => {
    const e = new CBusEvent('garbage');
    expect(e.isValid()).toBe(false);
  });
});
