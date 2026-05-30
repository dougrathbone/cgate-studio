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

  it('accepts a Buffer as input', () => {
    const e = new CBusEvent(Buffer.from('lighting on 254/56/4'));
    expect(e.isValid()).toBe(true);
    expect(e.getDeviceType()).toBe('lighting');
  });

  it('treats empty/whitespace input as invalid', () => {
    expect(new CBusEvent('').isValid()).toBe(false);
    expect(new CBusEvent('   ').isValid()).toBe(false);
    expect(new CBusEvent('').isParsed()).toBe(true);
  });

  it('parses a 300 object-status response with a level', () => {
    const e = new CBusEvent('300 //PROJECT/254/56/1: level=255');
    expect(e.isValid()).toBe(true);
    expect(e.getNetwork()).toBe('254');
    expect(e.getApplication()).toBe('56');
    expect(e.getGroup()).toBe('1');
    expect(e.getLevel()).toBe(255);
    expect(e.getAction()).toBe('on');
    expect(e.getDeviceType()).toBe('lighting');
  });

  it('derives an off action from a zero level status response', () => {
    const e = new CBusEvent('300 //PROJECT/254/56/1: level=0');
    expect(e.getAction()).toBe('off');
    expect(e.getLevel()).toBe(0);
  });

  it('parses with the statusDataOnly option', () => {
    const e = new CBusEvent('//PROJECT/254/56/9: level=128', { statusDataOnly: true });
    expect(e.isValid()).toBe(true);
    expect(e.getGroup()).toBe('9');
    expect(e.getLevel()).toBe(128);
  });

  it('flags an invalid status response shape', () => {
    const e = new CBusEvent('300 not-an-address');
    expect(e.isValid()).toBe(false);
  });

  it('strips a //PROJECT/ prefix from a standard event address', () => {
    const e = new CBusEvent('lighting on //HOME/254/56/4');
    expect(e.isValid()).toBe(true);
    expect(e.getAddress()).toBe('254/56/4');
  });

  it('extracts a level= value when the level token is non-numeric', () => {
    const e = new CBusEvent('lighting ramp 254/56/4 some-uuid level=200');
    expect(e.isValid()).toBe(true);
    expect(e.getLevel()).toBe(200);
  });

  it('falls back to the regex parser when the fast path cannot tokenize', () => {
    // Double spaces defeat the single-space fast path but still match EVENT_REGEX.
    const e = new CBusEvent('lighting  on  254/56/4 128');
    expect(e.isValid()).toBe(true);
    expect(e.getAddress()).toBe('254/56/4');
    expect(e.getLevel()).toBe(128);
  });

  it('exposes the raw event and a readable toString for valid and invalid events', () => {
    const valid = new CBusEvent('lighting ramp 254/56/4 128');
    expect(valid.getRawEvent()).toBe('lighting ramp 254/56/4 128');
    expect(valid.toString()).toContain('CBusEvent[lighting ramp 254/56/4');
    const invalid = new CBusEvent('garbage');
    expect(invalid.toString()).toContain('Invalid CBusEvent');
  });
});
