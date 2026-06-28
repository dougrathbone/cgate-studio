# Changelog

## [1.3.0](https://github.com/dougrathbone/cgate-studio/compare/cbus-studio-v1.2.0...cbus-studio-v1.3.0) (2026-06-28)


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
* **robustness:** emit treeChanged on C-Gate 742 async object events ([cfd05bd](https://github.com/dougrathbone/cgate-studio/commit/cfd05bd659f256ae22557c970dc96dc03a2b0c9e))
* **robustness:** hydrate group levels with one bulk query at connect ([8f2edf6](https://github.com/dougrathbone/cgate-studio/commit/8f2edf6f73baccb55e9cc7fa644bfc51d661c290))
* Scenes (M4) + Sensors/Measurement (M5) + live-event hardening ([82136f8](https://github.com/dougrathbone/cgate-studio/commit/82136f8c3ee6660030a53507ebb9bab27c9d9fde))
* **scenes:** add CgateService.fireScene for trigger control (app 202) ([ff52ff5](https://github.com/dougrathbone/cgate-studio/commit/ff52ff51b89925f5bee7e898a9e28d127024f24c))
* **scenes:** emit trigger-control events distinctly from lighting state ([d44da50](https://github.com/dougrathbone/cgate-studio/commit/d44da50658547d14b11eabe714c6424a6c2aed68))
* **scenes:** fire scenes from the tree and reconcile on 742 events ([ad69e15](https://github.com/dougrathbone/cgate-studio/commit/ad69e15c1aee21f4b4a024d9bf662a2324ee3029))
* **scenes:** render a Fire control for trigger-control groups ([ea21520](https://github.com/dougrathbone/cgate-studio/commit/ea21520ca6a93c70b87c2d44b5fc0aa04a9fa20d))
* **scenes:** wire fireScene, trigger and treeChanged across the IPC bridge ([f6cd543](https://github.com/dougrathbone/cgate-studio/commit/f6cd5435f1eea026c833c2f056d1419af3348fd0))
* **sensors:** add measurement event parser for C-Bus app 228 ([9570ebb](https://github.com/dougrathbone/cgate-studio/commit/9570ebb7ea4b0b9bacf0552839214f50f0e937f4))
* **sensors:** emit measurement events from the event stream ([36b8b27](https://github.com/dougrathbone/cgate-studio/commit/36b8b27d6b12a7c488231267eb657507554bb6d1))
* **sensors:** render live measurement values in a read-only Sensors section ([9731c5b](https://github.com/dougrathbone/cgate-studio/commit/9731c5bbdf6e48a1773218de2e7a0e9393f950ee))
* **sensors:** wire measurement push channel across the IPC bridge ([4ca0fd6](https://github.com/dougrathbone/cgate-studio/commit/4ca0fd6402178cdbf20bfef090a021f8d30b7186))
* support multiple saved C-Gate sites ([633989b](https://github.com/dougrathbone/cgate-studio/commit/633989b151e7d0baff5b5838eda5b46b2dc1d562))
* **ui:** add entity detail panel with GET */SET parameters ([60b905f](https://github.com/dougrathbone/cgate-studio/commit/60b905fab393ce25b96b1fbc4649c7db192d3978))


### Bug Fixes

* **cgate:** accumulate multi-line PROJECT LIST/DIR responses ([e9180f3](https://github.com/dougrathbone/cgate-studio/commit/e9180f3ceaf7c431620902339310e3935d94b9cf))
* **cgate:** avoid spurious disconnect during connect and getTree ([28baddb](https://github.com/dougrathbone/cgate-studio/commit/28baddb5c1aea3d125946e42e059c08300591332))
* **ci:** make project-parser test files modules to resolve tsc TS2451 redeclaration ([7c16df4](https://github.com/dougrathbone/cgate-studio/commit/7c16df47f0a932822086abb9051a1a4195a02f09))
* **connection:** never auto-reconnect after an intentional disconnect ([941ecfa](https://github.com/dougrathbone/cgate-studio/commit/941ecfa49103f4cf02f19cabf3ffd1617119ca60))
* **logging:** add silent level and silence logger in tests to fix CI late-log flake ([3406bcc](https://github.com/dougrathbone/cgate-studio/commit/3406bcc0c56f716825708c30e7a818c753b1094f))
* tear down prior connection on reconnect to avoid orphaned sockets ([c30c1d3](https://github.com/dougrathbone/cgate-studio/commit/c30c1d3fa9cba53b593b240497a201ba8a612604))


### Refactoring

* **scenes:** use neutral VALIDATE@live-cgate marker instead of a personal LAN IP ([e52a166](https://github.com/dougrathbone/cgate-studio/commit/e52a166e63713d7947b7ab3b3044dcaced23960d))


### Documentation

* add AGENTS.md and README.md for project overview and guidelines ([8e4e1ba](https://github.com/dougrathbone/cgate-studio/commit/8e4e1ba91beb38f945ff94d00051dc373bfc2b10))
* add project context notes (decisions log, vendoring guide) ([4b46e7c](https://github.com/dougrathbone/cgate-studio/commit/4b46e7cbac98dc2cfbe48179e2d0c3e3272a7f22))
* document operate/organize features, safety, and add a screenshot ([c2d4815](https://github.com/dougrathbone/cgate-studio/commit/c2d481544e085609c9636c17ec939b097be8578b))
* document Scenes (M4) and Sensors (M5) features in README ([577ffdd](https://github.com/dougrathbone/cgate-studio/commit/577ffdde757fc087346baebc094bb80e3d253a3b))
* M1 smoke checklist and dev/run instructions ([ffb7b4c](https://github.com/dougrathbone/cgate-studio/commit/ffb7b4c5ea1aa35a7e24fbf025238aea7843a741))
* **readme:** add hero image, download section, and release docs ([61ba3fa](https://github.com/dougrathbone/cgate-studio/commit/61ba3fa96e602b70cdd4c4a2286f80813df428e4))
* rewrite project README for public repo ([9ffad6b](https://github.com/dougrathbone/cgate-studio/commit/9ffad6b716559ac608045637b1584c9710511610))
* **scenes:** add M4 hardware validation checklist ([025e77d](https://github.com/dougrathbone/cgate-studio/commit/025e77d4bce03374bee42c9d6679b6b5d35b5485))
* **sensors:** add M5 hardware validation checklist ([657b40f](https://github.com/dougrathbone/cgate-studio/commit/657b40fb85222755ead37d156806f8459602f668))


### Build System

* add electron-builder installers for macOS and Windows ([02e0739](https://github.com/dougrathbone/cgate-studio/commit/02e0739c4ac10d48df483d8e4a0f1b182a7b28d4))
* don't auto-publish from electron-builder (release workflow attaches artifacts) ([5a956c3](https://github.com/dougrathbone/cgate-studio/commit/5a956c354600b58343bc40a5a87e81e9cf7ba979))

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
