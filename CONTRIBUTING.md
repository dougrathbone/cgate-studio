# Contributing to CBus Studio

Thanks for helping improve CBus Studio. This is an open-source community tool for
browsing and testing Clipsal C-Bus networks via an existing C-Gate server.

## Setup

1. Use the Node version in [`.nvmrc`](.nvmrc) (currently Node 23).
2. Install with **`npm ci`** (not bare `npm install`) so the locked `cgateweb`
   git commit is used.
3. Run the app with `npm run dev`.

## Checks before a PR

```bash
npm run test:ci    # tsc --noEmit + Jest with 80% coverage thresholds
npm run lint       # ESLint (advisory; keep new code clean)
```

CI (`.github/workflows/build.yml`) runs type-check, coverage, and `npm run build`
on macOS, Windows, and Linux. Release tags also run type-check + coverage before
building installers.

## Testing

- Prefer the in-process **mock C-Gate** under `tests/helpers/mockCgate.ts`.
- CI must not require a physical CNI or live C-Gate.
- Desk / hardware results live in [`docs/smoke-lab-status.md`](docs/smoke-lab-status.md).

## C-Gate client dependency

Protocol transport comes from `cgateweb/cgate-client` at a **release tag**.
See [`docs/context/vendoring-cgate-client.md`](docs/context/vendoring-cgate-client.md).
Do not import the `cgateweb` package root (MQTT bridge).

## Security / scope

- Renderer never opens sockets; C-Gate I/O stays in the Electron main process.
- Unit programming, bundled C-Gate/JRE, and MQTT/HA are out of scope.
- See [`SECURITY.md`](SECURITY.md) for vulnerability reporting.

## Signing

Optional Apple / Windows signing secrets are documented in
[`docs/context/code-signing.md`](docs/context/code-signing.md). Unsigned
installers are an intentional CI fallback when secrets are unset.
