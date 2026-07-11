# CBus Studio — Session Starter

Read this first when starting a fresh session on CBus Studio. It captures the
decisions made during brainstorming so you do not have to re-derive them.

## What we are building

An Electron desktop app (macOS-first, cross-platform bonus) that connects to an
existing C-Gate server over TCP and lets C-Bus owners browse, test, and organize
their network without a Windows box running C-Bus Toolkit.

Full design: [`../specs/2026-05-30-cbus-studio-design.md`](../specs/2026-05-30-cbus-studio-design.md)

## Decisions log (do not relitigate without reason)

| Decision | Choice | Why |
|---|---|---|
| Purpose | Open-source community tool | Useful to other Mac/C-Bus owners; not commercial; not just personal |
| Hardware target | CNI / Ethernet only | Pure TCP — avoids platform-specific serial port concerns |
| Scope | Browse + Commission/Test + Rename tag DB | The gaps that currently force users onto Windows Toolkit |
| Out of scope | Unit programming (Tier 3), MQTT/HA, bundled C-Gate, serial PCI | Proprietary / different product / risk |
| UI stack | Electron + React | Reuses cgateweb's JS C-Gate client; cross-platform for free |
| C-Gate relationship | Connect to an existing C-Gate | Simplest, zero licensing concern; managed mode deferred |
| Code reuse | Phased A→B: vendor cgateweb client now, extract shared `cgate-client` package later | Fast prototype now, maintainable end state later |
| Repo strategy | New standalone repo (this one), NOT a cgateweb monorepo sub-package | GUI and headless bridge are different products/audiences |

## Milestones (risk-ordered)

1. **M1 — Connect & Browse (read-only):** connect, `TREEXML` → tree, live state from event stream.
2. **M2 — Commission/Test:** switch / ramp / terminate-ramp on a selected group (transient, no DB writes).
3. **M3 — Organize:** rename network/group/app labels, `PROJECT SAVE` (only DB-writing milestone; gated + confirm).
4. **M4 — Scenes:** fire trigger-control groups (app 202).
5. **M5 — Sensors:** measurement app (228) live values + bulk level hydrate.
6. **M6 — Session & project:** disconnect, site edit/LOGIN, project + network pickers (Approach A). See `docs/superpowers/specs/2026-07-11-cgate-frontend-parity-design.md`.
7. **M7 — Network health:** NET OPEN/CLOSE/SYNC, status bar, FORCE, activity drawer.

**Approach A roadmap (approved):** M8 Commission UI → M9 tag DB authoring → M10 diagnostics. Unit programming remains out of scope.

## Architecture (one-liner)

Electron **main** owns all C-Gate I/O via the vendored client and a `CgateService`
facade; **renderer** (React) talks to main over a typed, context-isolated IPC
bridge and never opens sockets.

## Where things live

- Spec: `docs/specs/2026-05-30-cbus-studio-design.md`
- Plan: `docs/plans/` (implementation plan)
- Vendoring guide: `docs/context/vendoring-cgate-client.md`
- Source `cgateweb` repo to vendor from: `/Users/doug/Documents/Code/cgateweb`

## First implementation steps (once planning is done)

1. Scaffold Electron + React + TypeScript project (main/preload/renderer split).
2. Vendor the C-Gate client modules (see vendoring guide) into `src/cgate-client/`.
3. Build `CgateService` (main) + a mock C-Gate test server.
4. M1 UI: connection form + tree browser + live-state badges.
