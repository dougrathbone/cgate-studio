# M7 — Network Health Implementation Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans. Checkbox steps for tracking.

**Goal:** Expose network open/close/sync, live health in a status bar, FORCE on control when needed, and an optional command activity drawer.

**Spec:** `docs/superpowers/specs/2026-07-11-cgate-frontend-parity-design.md` (M7)

**Tech:** Existing `CgateService` + IPC + React; mock C-Gate for CI.

---

### Scope

1. `NET OPEN` / `NET CLOSE` / `DO <net> SYNC` (+ progress / busy UI)
2. Status bar: connection · project · network State / InterfaceState / SyncState
3. Append `FORCE` to ON/OFF/RAMP when network `State` is `new` (or SyncState not idle/ok)
4. Activity drawer: recent command/response lines (ring buffer)

### Non-goals

- Unit programming, unravel, full Toolkit diagnostics utility

---

### Task overview

| Task | Deliverable |
|---|---|
| 1 | Types + parse helpers for health / activity |
| 2 | Mock NET OPEN/CLOSE/SYNC + GET health |
| 3 | CgateService methods + FORCE + activity emit |
| 4 | IPC / preload / api |
| 5 | StatusBar + Sync/Open controls + ActivityDrawer |
| 6 | Wire App; refresh health after list/sync |
| 7 | Tests, smoke checklist, README |

---
