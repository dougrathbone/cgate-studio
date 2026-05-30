const constants = require('../../src/cgate-client/constants');

describe('cgate-client constants', () => {
  it('exposes core C-Gate command/response codes', () => {
    expect(constants.CGATE_CMD_TREEXML).toBe('TREEXML');
    expect(constants.CGATE_CMD_EVENT_ON).toBe('EVENT ON');
    expect(constants.CGATE_RESPONSE_TREE_START).toBe('343');
    expect(constants.CGATE_RESPONSE_TREE_END).toBe('344');
    expect(constants.CGATE_LEVEL_MAX).toBe(255);
  });

  it('builds Home Assistant entity id fields', () => {
    expect(constants.entityIdFields('light', 'cbus_254_56_4')).toEqual({
      default_entity_id: 'light.cbus_254_56_4',
      object_id: 'cbus_254_56_4',
    });
  });

  it('freezes the shared retained-state options', () => {
    expect(Object.isFrozen(constants.MQTT_RETAINED_STATE_OPTIONS)).toBe(true);
  });

  it('matches a standard event with EVENT_REGEX', () => {
    const m = 'lighting on 254/56/4 128'.match(constants.EVENT_REGEX);
    expect(m).not.toBeNull();
    expect(m![3]).toBe('254/56/4');
  });
});
