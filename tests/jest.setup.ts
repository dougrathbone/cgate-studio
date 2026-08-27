// Silence the cgateweb C-Gate client logger during tests. Upstream's Logger
// no longer has a `silent` level (Studio used to vendor that). Socket
// teardown from expected ECONNREFUSED can otherwise log after a suite
// finishes ("Cannot log after tests are done").
process.env.LOG_LEVEL = 'error';

const { Logger } = require('cgateweb/cgate-client');
Logger.prototype._shouldLog = function () {
  return false;
};
