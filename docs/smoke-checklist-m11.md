# Smoke checklist — M11 Distribution

Signing and auto-update cannot be fully proven without Apple / Windows certificates and a tagged GitHub Release. Use this after secrets are in place and a `v*` tag is published.

## Unsigned fallback (no secrets)

Proven on **v1.3.2** (2026-09-04) — Release workflow logs showed `MACOS_CSC_LINK` / `WIN_CSC_LINK` unset; installers published anyway.

- [x] Release workflow completes on macOS, Windows, and Linux
- [x] GitHub Release includes `.dmg`, `-mac.zip`, Windows `.exe`, `.AppImage`
- [x] Release includes `latest.yml`, `latest-mac.yml`, `latest-linux.yml` (and `.blockmap` when electron-builder emits them)
- [x] CI used unsigned fallback when certs were missing; **v1.3.2** release notes updated to state macOS/Windows **unsigned**. Future tags emit per-build status from the Release workflow.

## Signed macOS (secrets present)

- [ ] `codesign -dv --verbose=4` on the `.app` inside the `.dmg` shows Developer ID
- [ ] `spctl --assess --type install` / first launch on a clean Mac does **not** require right-click Open
- [ ] Notary history shows the build Accepted

## Signed Windows

- [ ] Properties → Digital Signatures on the NSIS `.exe` shows the Authenticode cert
- [ ] SmartScreen is absent or reduced vs the unsigned 1.3.0 exe (EV still best)

## Auto-update

Updater metadata for **v1.3.2** is published (`latest-mac.yml` / `latest.yml` / `latest-linux.yml` point at 1.3.2). End-to-end N→N+1 still needs a desk install:

- [ ] Install packaged N, publish N+1, launch N → banner **Restart to update**
- [ ] Restart lands on N+1 (`About` version)
- [ ] **Check for Updates…** while already current reports no update (no error banner)
- [ ] `npm run dev` Check for Updates explains packaged-only behaviour

## Linux

- [ ] AppImage launches on a recent Ubuntu/Fedora and connects to C-Gate over TCP
