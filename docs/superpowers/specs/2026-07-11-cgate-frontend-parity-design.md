# CBus Studio — Best C-Gate Front-End (Approach A)

**Date:** 2026-07-11  
**Status:** Approved  
**Supersedes for scope:** expands beyond M1–M5 browse/test/rename into documented C-Gate API + UI workflows; does **not** reverse the unit-programming non-goal.

## Goal

Make CBus Studio the best open-source **C-Gate front-end** for day-2 operations and light commissioning — so homeowners and installers rarely need Windows Toolkit for browse, test, label, project/session, network health, and tag-DB work.

Toolkit / SpaceLogic Commission remain the unit programmers.

## Non-goals (unchanged)

- Unit EEPROM programming / “Transfer to Network” / signed unit catalogues
- SpaceLogic Commission–only features (DALI-2, profiles, sequences, RGB indicators)
- PICED (touchscreens / PAC)
- Bundled C-Gate / JRE
- Serial / USB PCI (CNI / Ethernet only)
- MQTT / Home Assistant (`cgateweb`)

## Product positioning

| Persona | Primary mode | Needs |
|---|---|---|
| Homeowner | **Operate** | Sites, live tree, on/off/dim, rename + save, fire scenes, sensors |
| Installer | **Commission** | Project/session, multi-network, scan/sync, Groups bench, diagnostics, tag authoring |

**UI direction:** keep the Control Console aesthetic; borrow Toolkit *information architecture* (session → project → network → groups/units), not Win32 chrome.

## Architecture

Unchanged core:

- Electron **main** owns all C-Gate I/O via `CgateService` + vendored client
- Renderer talks only over typed IPC (`contextIsolation`, no `nodeIntegration`)
- Mock C-Gate for CI; hardware smoke checklists for live validation

New session model:

```
Site (saved connection)
  └── Session (TCP + optional LOGIN)
        ├── Project (LOAD / START / USE / SAVE)
        └── Network(s) (LIST → pick → OPEN / SYNC → TREEXML)
              ├── Operate: live tree + controls
              └── Commission: inventory, Groups bench, health, tag DB
```

## Milestones

### M6 — Session & project

- Explicit **Disconnect**; **edit site** (host/ports); optional LOGIN fields on site
- Project picker: `PROJECT DIR` / `LIST` / `LOAD` / `START` / `USE`
- Multi-network: `NET LIST` → picker; drop hardcoded `254`
- Project-qualified `TREEXML //project/<net>` with bare-net fallback for older C-Gate

### M7 — Network health

- `NET OPEN` / `CLOSE`, `DO <net> SYNC` (with progress UI)
- Status bar: connection, project, network State / InterfaceState / SyncState
- `FORCE` on control commands when network state requires it
- Optional command/event activity drawer

### M8 — Commission UI shell

- Dual-mode: **Operate** | **Commission**
- Commission: network inventory, Groups workspace (flat filterable table + toolbar), scan/refresh with progress, richer unit inspector (still no programming tabs)
- Bulk multi-select on/off/level

### M9 — Tag DB authoring

- Create / delete / rename applications and groups in the project DB
- All DB writes gated + confirm-on-save (align EntityPanel SETs with dirty banner)
- Mismatch cues where C-Gate exposes comparable live vs tag data

### M10 — Diagnostics polish

- Ping / presence / `ID` summaries
- CSV export of tags
- Keyboard density (filter focus, tree nav)
- Harden M4/M5 live wire formats from smoke checklists

## Safety

- Transient control remains non-DB-writing
- Any `PROJECT SAVE`, `DBSET`/`DBADD`, or network sync that mutates project state requires explicit confirm
- Never claim unit-programming capability in UI copy

## Success criteria

An installer with an already-running C-Gate + CNI can:

1. Connect, pick project, pick network, browse and control without Toolkit
2. Sync/refresh and see network health without Toolkit
3. Create/rename/delete group tags and save the project without Toolkit
4. Still open Toolkit only when they need to program a physical unit
