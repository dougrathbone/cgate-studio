// Silence the vendored C-Gate client logger during tests. The client logs
// socket warnings/errors (e.g. expected ECONNREFUSED on connect-failure tests)
// asynchronously from socket teardown; when one of those writes lands after a
// parallel test file has finished, Jest fails the active suite with "Cannot log
// after tests are done". Setting LOG_LEVEL before any module (and therefore any
// component logger) is imported makes every logger silent, keeping test output
// pristine and the suite deterministic across platforms.
process.env.LOG_LEVEL = 'silent';
