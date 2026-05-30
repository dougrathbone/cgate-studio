# Vendored from cgateweb

These modules are copied verbatim from the cgateweb project.

- Upstream repository: https://github.com/dougrathbone/cgateweb (canonical source)
- Commit: 0598a3318d9d76fb0e2a5e8f782eef0350fa7241
- Release/tag: release 1.10.0 (tag `v1.10.0`; the recorded commit is the exact tagged commit)
- Local source path (machine-specific, secondary reference): `/Users/doug/Documents/Code/cgateweb/src`

## Vendored files

- `cgateConnection.js`
- `constants.js`
- `logger.js`
- `backoff.js`
- `cbusEvent.js`

Phase B will replace this directory with a dependency on a shared `cgate-client` package.
Do not edit these files except to fix require() resolution; report upstream-worthy fixes back to cgateweb.

## require() resolution fixes applied

- `constants.js`: changed `require('../package.json')` to `require('../../package.json')`
  so the version lookup resolves to the cbus-studio project root rather than `src/package.json`.
