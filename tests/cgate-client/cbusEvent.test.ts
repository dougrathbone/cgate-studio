const { CBusEvent } = require('cgateweb/cgate-client');

describe('cgateweb CBusEvent (protocol contract)', () => {
  it('parses a lighting ramp event into components', () => {
    const e = new CBusEvent('lighting ramp 254/56/4 128');
    expect(e.isValid()).toBe(true);
    expect(e.getNetwork()).toBe('254');
    expect(e.getApplication()).toBe('56');
    expect(e.getGroup()).toBe('4');
    expect(e.getAction()).toBe('ramp');
    expect(e.getLevel()).toBe(128);
  });

  it('parses a 300 object-status response with a level', () => {
    const e = new CBusEvent('300 //PROJECT/254/56/1: level=255');
    expect(e.isValid()).toBe(true);
    expect(e.getLevel()).toBe(255);
    expect(e.getAction()).toBe('on');
  });

  it('marks unparseable input invalid', () => {
    expect(new CBusEvent('garbage').isValid()).toBe(false);
  });
});
