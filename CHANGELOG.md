# Changelog

## [Unreleased]

## [1.3.2](https://github.com/dougrathbone/cgate-studio/compare/v1.3.1...v1.3.2) (2026-09-04)

### Features

* **ui:** custom Control Console app icon (amber light bulb on slate)

## [1.3.1](https://github.com/dougrathbone/cgate-studio/compare/v1.3.0...v1.3.1) (2026-09-04)

### Features

* **dist:** sign and notarize installers when GitHub Actions secrets are set; unsigned fallback otherwise (M11)
* **dist:** in-app auto-update from GitHub Releases (`electron-updater`); Help → Check for Updates
* **dist:** Linux x64 AppImage on the Release workflow
* **ui:** Help/About links to GitHub repository, releases, and issues (all platforms)

### Documentation

* M11 distribution spec/plan, code-signing secrets guide, hardware lab status vs CI
* record the approved entity-inspector tabs design spec

## [1.3.0](https://github.com/dougrathbone/cgate-studio/compare/v1.2.0...v1.3.0) (2026-08-27)

### Features

* **session:** project and network pickers (`PROJECT DIR`/`LIST`/`LOAD`/`START`/`USE`, `NET LIST`); explicit disconnect; site edit + optional LOGIN (M6)
* **network:** health status bar (State / InterfaceState / SyncState), Open / Close / Sync, `FORCE` when unsynced, activity drawer (M7)
* **ui:** Operate / Commission modes with inventory, groups workspace, bulk on/off/level (M8)
* **tags:** TagName rename, soft-delete to `<Unused>`, dirty banner aligned with EntityPanel SETs, live vs tag mismatch cue (M9)
* **diagnostics:** unit Identify (`ID`), CSV tag export, `/` focuses the active filter, per-application bulk `GET …/* level` (M10)
* **cgate:** depend on `cgateweb/cgate-client` v1.32.0 instead of a vendored protocol copy (command handshake is now `EVENT e6s0c0`)

### Bug Fixes

* **cgate:** C-Gate 3.x list framing and `DBGET` slash paths
* **ui:** header / sidebar layout, shared square close control, C-Gate status panel spacing

### Documentation

* document M6–M10 in the README; record ISC license (LICENSE already shipped)

## [1.2.0](https://github.com/dougrathbone/cgate-studio/compare/v1.1.0...v1.2.0) (2026-06-28)


### Features

* **scenes:** fire C-Bus scenes from the tree via Trigger Control (application 202) — transient, no database writes
* **scenes:** emit trigger-control events distinctly from lighting state, with a last-fired indicator
* **scenes:** render a Fire control (action-selector + button) for trigger-control groups
* **robustness:** reconcile the device tree on C-Gate `742` async object events (debounced re-fetch)
* **sensors:** display live Measurement-application (228) sensor values in a read-only Sensors section
* **robustness:** hydrate group levels with one bulk query at connect (graceful per-group fallback)

### Bug Fixes

* **connection:** never auto-reconnect after an intentional disconnect
* **logging:** add a silent level and silence the logger in tests (pristine, deterministic test output)
* **ci:** make project-parser test files modules to resolve a `tsc` TS2451 redeclaration

### Documentation

* document Scenes (M4) and Sensors (M5) in the README; add M4/M5 hardware-validation checklists

## [1.1.0](https://github.com/dougrathbone/cgate-studio/compare/cbus-studio-v1.0.0...cbus-studio-v1.1.0) (2026-05-31)


### Features

* add About menu with GitHub link and license viewer ([09e01e0](https://github.com/dougrathbone/cgate-studio/commit/09e01e0a834689bcb17ed4cd60ef620d14ee0081))
* add context-isolated preload bridge (window.cgate) ([d8f7d8f](https://github.com/dougrathbone/cgate-studio/commit/d8f7d8f04def883544c60e75a6206286a6db703a))
* add shared TS types for tree, state, connection ([7195808](https://github.com/dougrathbone/cgate-studio/commit/71958089f75f225fd27a8c554feb8e7b878ab391))
* add TREEXML response-code stripping and tree parsing ([de3735b](https://github.com/dougrathbone/cgate-studio/commit/de3735b489d39397f3f2d3e0002a193ec597b1a4))
* browse live networks as a collapsible device tree ([86a0c38](https://github.com/dougrathbone/cgate-studio/commit/86a0c389a375f463a40480acbbe5a2188048fd6c))
* CgateService connect, getTree, and live state events ([c0c14da](https://github.com/dougrathbone/cgate-studio/commit/c0c14daa7c454f7e8286d2ec5cd9e54ce3563f49))
* **cgate:** show connected server status in header panel ([fdc1bc2](https://github.com/dougrathbone/cgate-studio/commit/fdc1bc2e68c6355c11d61a2feea2af056eeb563e))
* define IPC channels and main-process handlers ([a5faf2e](https://github.com/dougrathbone/cgate-studio/commit/a5faf2ec6fdfc7b327d306f1a69e6dbb36e374c6))
* electron main entry, window with secure webPreferences, vite config ([df42ddf](https://github.com/dougrathbone/cgate-studio/commit/df42ddf48510acc85ca77f5dae840a0c85d6eb13))
* **labels:** export tree labels to Toolkit .xml/.cbz files ([6a57231](https://github.com/dougrathbone/cgate-studio/commit/6a57231e6f07b4eca80e1dad2f0ec5d9a0f6bed2))
* **labels:** persist imported labels per site in userData ([ab0e5cb](https://github.com/dougrathbone/cgate-studio/commit/ab0e5cb761f933810ca4466629cf35b6ecfb0145))
* network tree view with live state badges ([1cafcfc](https://github.com/dougrathbone/cgate-studio/commit/1cafcfc5cb37eee2f4297b738fed3385735b968e))
* operate, organize & enrich the device tree ([01ef46f](https://github.com/dougrathbone/cgate-studio/commit/01ef46f9e8c4bb8cb9cab83d32b66636369d4d00))
* renderer root, typed API wrapper, connection form, status wiring ([925a0eb](https://github.com/dougrathbone/cgate-studio/commit/925a0eb4bccf56e47d97e72c9963f0abe8e1f1f0))
* support multiple saved C-Gate sites ([633989b](https://github.com/dougrathbone/cgate-studio/commit/633989b151e7d0baff5b5838eda5b46b2dc1d562))
* **ui:** add entity detail panel with GET */SET parameters ([60b905f](https://github.com/dougrathbone/cgate-studio/commit/60b905fab393ce25b96b1fbc4649c7db192d3978))


### Bug Fixes

* **cgate:** accumulate multi-line PROJECT LIST/DIR responses ([e9180f3](https://github.com/dougrathbone/cgate-studio/commit/e9180f3ceaf7c431620902339310e3935d94b9cf))
* **cgate:** avoid spurious disconnect during connect and getTree ([28baddb](https://github.com/dougrathbone/cgate-studio/commit/28baddb5c1aea3d125946e42e059c08300591332))
* tear down prior connection on reconnect to avoid orphaned sockets ([c30c1d3](https://github.com/dougrathbone/cgate-studio/commit/c30c1d3fa9cba53b593b240497a201ba8a612604))


### Documentation

* add AGENTS.md and README.md for project overview and guidelines ([8e4e1ba](https://github.com/dougrathbone/cgate-studio/commit/8e4e1ba91beb38f945ff94d00051dc373bfc2b10))
* add project context notes (decisions log, vendoring guide) ([4b46e7c](https://github.com/dougrathbone/cgate-studio/commit/4b46e7cbac98dc2cfbe48179e2d0c3e3272a7f22))
* document operate/organize features, safety, and add a screenshot ([c2d4815](https://github.com/dougrathbone/cgate-studio/commit/c2d481544e085609c9636c17ec939b097be8578b))
* M1 smoke checklist and dev/run instructions ([ffb7b4c](https://github.com/dougrathbone/cgate-studio/commit/ffb7b4c5ea1aa35a7e24fbf025238aea7843a741))
* **readme:** add hero image, download section, and release docs ([61ba3fa](https://github.com/dougrathbone/cgate-studio/commit/61ba3fa96e602b70cdd4c4a2286f80813df428e4))
* rewrite project README for public repo ([9ffad6b](https://github.com/dougrathbone/cgate-studio/commit/9ffad6b716559ac608045637b1584c9710511610))


### Build System

* add electron-builder installers for macOS and Windows ([02e0739](https://github.com/dougrathbone/cgate-studio/commit/02e0739c4ac10d48df483d8e4a0f1b182a7b28d4))
* don't auto-publish from electron-builder (release workflow attaches artifacts) ([5a956c3](https://github.com/dougrathbone/cgate-studio/commit/5a956c354600b58343bc40a5a87e81e9cf7ba979))
