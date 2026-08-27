# AGENTS.md — CBus Studio

Guidance for AI agents (and humans) working in this repo.

## What this project is

An Electron desktop app (macOS-first, cross-platform bonus) that connects to an
**existing C-Gate** server over TCP and lets C-Bus owners **browse, test, and
organize** their network without a Windows machine running C-Bus Toolkit.
Open-source community tool. **Not** a Toolkit clone — no unit programming.

## Start here

1. Read [`docs/context/session-starter.md`](docs/context/session-starter.md) — the decisions log.
2. Read the design spec: [`docs/specs/2026-05-30-cbus-studio-design.md`](docs/specs/2026-05-30-cbus-studio-design.md).
3. Read the implementation plan in `docs/plans/` before writing code.
4. To reuse the C-Gate client, follow [`docs/context/vendoring-cgate-client.md`](docs/context/vendoring-cgate-client.md) — import `cgateweb/cgate-client`, never the package root.

## Hard constraints (decided during brainstorming)

- **CNI / Ethernet only** — pure TCP. Do not add serial/USB PCI support.
- **Connect to an existing C-Gate** — do not bundle C-Gate/JRE in the MVP.
- **No MQTT / Home Assistant** — that is `cgateweb`'s domain.
- **No unit programming** (Tier 3) — out of scope.
- **Tag DB editing** (M3/M9): rename + soft-delete (`TagName` → `<Unused>`) via `DBSET`; the only paths that write to the project DB, gated behind confirm-on-save.
- **Security:** renderer never opens sockets. All C-Gate I/O lives in the Electron
  main process behind `CgateService`. Use `contextIsolation: true`, a `preload`
  bridge, and no `nodeIntegration` in the renderer.

## Milestones

- **M1** Connect & Browse (read-only): `TREEXML` → tree + live state from event stream.
- **M2** Commission/Test: switch / ramp / terminate-ramp (transient, no DB writes).
- **M3** Organize: rename labels + `PROJECT SAVE` (gated, confirm-on-save).
- **M4–M10** shipped on the Approach A roadmap (scenes, sensors, session, health, commission UI, tag DB, diagnostics). Unit programming remains out of scope.

## Conventions

- Test against a **mock C-Gate** (fake TCP server with canned fixtures); CI must not need real hardware.
- Depend on `cgateweb/cgate-client` at a tagged git ref. Keep only TREEXML / export / the Studio label parser in `src/cgate-client/`.

## Related repo

- `cgateweb`: https://github.com/dougrathbone/cgateweb — protocol client via `cgateweb/cgate-client`.
