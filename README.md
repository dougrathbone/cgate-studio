# CBus Studio

A cross-platform (macOS-first) desktop app to **browse, test, and organize** a
Clipsal C-Bus network — without needing a Windows machine running C-Bus Toolkit.

CBus Studio is an [Electron](https://www.electronjs.org/) app that talks to an
existing **C-Gate** server over TCP (the same documented command/event interface
that C-Bus Toolkit drives under the hood) and gives C-Bus owners a native GUI for
their network. It is an open-source community tool and deliberately does **not**
attempt Toolkit's proprietary unit-programming layer.

## Why

C-Bus Toolkit is Windows-only, but the engine it drives — **C-Gate** — is pure
Java and already runs on macOS/Linux. The problem was never "port Toolkit to the
Mac"; it's "run the already-portable engine and build a native front-end against
its documented interface." CBus Studio is that front-end.

## Features

### Available now — M1: Connect & Browse (read-only)

- Connect to an existing C-Gate over TCP (command + event/status ports).
- Render the network tree — **networks → applications → groups** — with labels,
  parsed from `TREEXML`.
- Show **live state** (on/off + level) on each group, updated in real time from
  the C-Gate event stream.

### Roadmap

- **M2 — Commission / Test:** switch, ramp, and terminate-ramp a selected group
  (transient commands only, no database writes) to verify wiring during an install.
- **M3 — Organize:** view and **rename** network/application/group labels and
  persist via `PROJECT SAVE` (gated behind an explicit edit mode + confirm-on-save).

## Requirements

- A running **C-Gate** server reachable over TCP — default command port `20023`,
  event/status port `20025`. (CBus Studio connects to a C-Gate you already run; it
  does not bundle C-Gate or a JRE.)
- A **CNI (Ethernet)** C-Bus interface — everything is pure TCP. USB/serial PCI is
  out of scope.

## Getting started

```bash
npm install      # install dependencies
npm run dev      # launch the app (electron-vite dev)
npm test         # run the Jest test suite
npm run build    # production build (main + preload + renderer)
```

`npm run dev` opens the app window; enter your C-Gate host and ports and click
**Connect** to browse the network. A manual hardware-verification checklist lives in
[`docs/smoke-checklist-m1.md`](docs/smoke-checklist-m1.md).

## Architecture

```
┌─────────────────────── Electron app ───────────────────────┐
│  Renderer (React UI)          Main (Node)                   │
│  ┌──────────────────┐  IPC   ┌──────────────────────────┐   │
│  │ Connection form  │◄──────►│ CgateService             │   │
│  │ Network tree     │        │  └─ vendored cgate-client│───┼──TCP──► C-Gate ──► CNI ──► C-Bus
│  │ Live-state badges│        │     (conn, parsers,       │   │
│  └──────────────────┘        │      TREEXML, events)     │   │
│                              └──────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

- The **main process** owns all C-Gate I/O behind a `CgateService` facade. The
  **renderer never opens sockets** — it talks to main only over a typed,
  context-isolated IPC bridge (`contextIsolation: true`, a `preload` bridge, and
  `nodeIntegration: false`).
- All networked logic is tested against an **in-process mock C-Gate** TCP server, so
  the test suite needs no real hardware.

**Tech stack:** Electron, electron-vite, React, TypeScript, Jest, Node `net`.

## Relationship to cgateweb

CBus Studio reuses the tested C-Gate protocol client from the sibling
[`cgateweb`](https://github.com/dougrathbone/cgateweb) project (connection,
event/command parsers, TREEXML handling). For now those modules are **vendored**
into `src/cgate-client/`; the plan is to later extract them into a shared
`cgate-client` package depended on by both projects. See
[`docs/context/vendoring-cgate-client.md`](docs/context/vendoring-cgate-client.md).

## Non-goals

- **No unit programming** — downloading config/scenes/logic to physical devices is
  Toolkit's proprietary domain and out of scope.
- **No MQTT / Home Assistant** — that is `cgateweb`'s job.
- **No bundled C-Gate / JRE** — connect to a C-Gate you already run.
- **No serial/USB PCI** — CNI/Ethernet only.

## License

TBD (intended open source).
