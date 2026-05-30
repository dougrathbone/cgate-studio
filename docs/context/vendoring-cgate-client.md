# Vendoring the C-Gate client (Phase A)

CBus Studio reuses the tested C-Gate protocol client from `cgateweb`. In Phase A
we **copy** the relevant modules into this repo to move fast. In Phase B we extract
them into a shared `cgate-client` npm package consumed by both projects.

**Source repo:** `/Users/doug/Documents/Code/cgateweb` (modules under `src/`).
**Target:** `src/cgate-client/` in this repo.

## Modules to vendor

Protocol client (no MQTT/HA coupling):

| Module | Purpose | Internal deps | External (npm) deps |
|---|---|---|---|
| `cgateConnection.js` | Single TCP connection + reconnect | `logger`, `backoff`, `constants` | — (`net`, `events` built-in) |
| `cgateConnectionPool.js` | Pool of command connections, round-robin, health | `cgateConnection`, `logger`, `constants`, `backoff` | — |
| `connectionManager.js` | Higher-level connect/disconnect orchestration | (verify on copy) | — |
| `cbusEvent.js` | Parse event/status-stream lines | `logger`, `constants` | — |
| `cbusCommand.js` | Build C-Gate commands | (verify on copy) | — |
| `commandResponseProcessor.js` | Match responses to commands | (verify on copy) | — |
| `lineProcessor.js` | Frame TCP stream into lines | (verify on copy) | — |
| `cbusProjectParser.js` | TREEXML → network tree | `logger` | `adm-zip`, `xml2js` |
| `labelLoader.js` | Load label/tag data | (verify on copy) | (verify on copy) |

Shared base modules these depend on (vendor these too):

- `constants.js` — regexes (`EVENT_REGEX`), response codes, `NEWLINE`, etc.
- `logger.js` — `createLogger` (consider swapping for an Electron-friendly logger later).
- `backoff.js` — `backoffDelay(retryNumber, { initialMs, maxMs, jitter })`.

## npm dependencies to add

- `adm-zip` — used by `cbusProjectParser` (project DB zip handling).
- `xml2js` — used by `cbusProjectParser` (TREEXML parsing).

## Procedure

1. Copy the modules above into `src/cgate-client/`, preserving relative `require('./...')` paths.
2. Run an import-resolution pass: from a scratch script, `require('./src/cgate-client/cgateConnectionPool')` and friends; add any module the resolver complains about (the "verify on copy" rows). Repeat until it resolves cleanly.
3. Copy the corresponding Jest tests from `cgateweb/tests/` for the vendored modules; get them green here. These are your regression safety net.
4. Keep a `VENDORED_FROM.md` noting the source commit SHA of `cgateweb` so Phase B extraction can diff against upstream.

## Phase B (later)

Once the prototype is validated against a real CNI, extract `src/cgate-client/`
into a standalone `cgate-client` npm package with a documented public API, publish
it (or use a workspace/local link), and have **both** CBus Studio and `cgateweb`
depend on it. Delete the vendored copy here in favour of the dependency.
