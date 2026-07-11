# M10 — Diagnostics Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Checkbox steps for tracking.

**Goal:** Ship installer-facing diagnostics: unit Identify/`ID` summaries, CSV tag export, denser keyboard navigation, and harden M4/M5 live wire formats against C-Gate 3.x.

**Architecture:** Keep all C-Gate I/O in `CgateService`. Fix bulk level hydrate to query per application (live 3.3.2 rejects network-wide `/* level`). Add CSV beside existing XML/CBZ export. Thin UI for Identify + keyboard shortcuts; no Toolkit diagnostics clone.

**Tech Stack:** Existing Electron IPC, React, mock C-Gate, Jest.

**Spec:** `docs/superpowers/specs/2026-07-11-cgate-frontend-parity-design.md` (M10)

---

### Scope

1. Ping / presence / `ID` — unit Identify action + summary cues from GET params
2. CSV export of group tags (alongside XML/CBZ)
3. Keyboard density — `/` focuses active filter; Escape clears filter when focused
4. Harden M4/M5 wire formats from live smoke (bulk levels, TRIGGER EVENT confirmed)

### Non-goals

- Full Toolkit diagnostics utility
- Unit programming / EEPROM
- Activity-drawer rewrite (M7 already shipped)
- Claiming Identify always succeeds (C-Gate may return `521 Unit unavailable`)

---

### Live spike notes (C-Gate 3.3.2 / 5COGAN)

| Item | Result |
|---|---|
| `GET //proj/net/* level` | **Fails** — hits apps without `level` (e.g. 223) → `402` |
| `GET //proj/net/56/* level` | **Works** — `300-` continuations + final `300` |
| `TRIGGER EVENT //proj/net/202/g sel` | **Works** — `200 OK` (assumption confirmed) |
| `ID //proj/net/p/unit` | Verb exists; often `521 Identify failed` if unit unavailable |
| `PING` as command | Syntax error (keep-alive only in connection layer) |

---

### File map

| File | Role |
|---|---|
| `CgateService.ts` | Per-app `getNetworkLevels`; `identifyUnit` |
| `mockCgate.ts` | Mock per-app bulk + ID |
| `projectExport.ts` / IPC | CSV export path |
| `EntityPanel.tsx` | Identify button on unit Summary |
| `DeviceTree` / `GroupsWorkspace` / `InventoryTable` | `/` focus filter |
| `App.tsx` | Wire export CSV filter; pass apps into levels |
| Smoke M4/M5/M10 | Record validations |

---

### Task overview

| Task | Deliverable |
|---|---|
| 1 | Harden `getNetworkLevels` to per-application bulk GET |
| 2 | `identifyUnit` + EntityPanel Identify control |
| 3 | CSV tag export |
| 4 | Keyboard density (`/` → filter) |
| 5 | Smoke checklists + tests + commit |

---

### Task 1: Per-app bulk levels

**Files:** `CgateService.ts`, `mockCgate.ts`, `App.tsx`, tests

- [x] Change `getNetworkLevels(network, applications?: string[])` to issue `GET //proj/net/<app>/* level` for each app (default `['56']` if none given)
- [x] App passes application addresses from current tree
- [x] Mock accepts per-app form; keep network-wide form for back-compat tests or update tests
- [x] Update smoke-checklist-m5 with live finding

---

### Task 2: Identify / presence

**Files:** `CgateService.ts`, ipc, preload, api, `EntityPanel.tsx`

- [x] `identifyUnit(network, unitAddress)` → `ID //proj/net/p/unit`
- [x] Surface success or friendly `521` message (not a crash)
- [x] Unit Summary: **Identify** button + short hint
- [x] Tests

---

### Task 3: CSV export

**Files:** `projectExport.ts`, `ipc.ts`, App export UI

- [x] `buildLabelsCsv(tree)` → `network,application,group,address,label`
- [x] Save dialog includes `.csv`
- [x] Header Export still one action; extension picks format
- [x] Tests

---

### Task 4: Keyboard density

**Files:** DeviceTree, GroupsWorkspace, InventoryTable (+ thin shared helper if useful)

- [x] Global `/` (when not in an input) focuses the visible filter
- [x] Escape in filter clears and blurs
- [x] Tests

---

### Task 5: Polish

- [x] `docs/smoke-checklist-m10.md`
- [x] Update M4/M5 checklists with confirmed TRIGGER + bulk-per-app
- [x] Full suite green + commit

---

### Safety

- Identify is transient (no DB write)
- CSV export is read-only file write on the user’s machine
- Do not auto-fire scenes during validation beyond intentional smoke
