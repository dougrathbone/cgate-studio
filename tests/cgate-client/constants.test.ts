const { constants } = require('cgateweb/cgate-client');

describe('cgateweb protocol constants', () => {
  it('exposes core C-Gate command/response codes', () => {
    expect(constants.CGATE_CMD_TREEXML).toBe('TREEXML');
    expect(constants.CGATE_CMD_EVENT_MODE_L6).toBe('EVENT e6s0c0');
    expect(constants.CGATE_RESPONSE_TREE_START).toBe('343');
    expect(constants.CGATE_RESPONSE_TREE_END).toBe('344');
    expect(constants.CGATE_RESPONSE_SYSTEM_EVENT).toBe('742');
    expect(constants.CGATE_LEVEL_MAX).toBe(255);
  });

  it('does not export MQTT or Home Assistant vocabulary', () => {
    expect(constants.MQTT_TOPIC_PREFIX_CBUS).toBeUndefined();
    expect(constants.entityIdFields).toBeUndefined();
  });
});
