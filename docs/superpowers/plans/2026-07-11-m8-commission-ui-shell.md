# M8 — Commission UI Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add Operate | Commission dual-mode UI with network inventory, a flat Groups workspace (filter + multi-select bulk on/off/level), and scan/refresh progress — without unit programming.

**Architecture:** Keep Electron main / `CgateService` control as single-group `setLevel` (serialized). Commission mode swaps the main content area for table workspaces; reuse `tree`, `states`, `selection`, `EntityPanel`, and StatusBar Sync as refresh. Bulk actions loop `setLevel` with bounded concurrency and busy UI.

**Tech Stack:** React renderer, existing IPC/`cgate` API, Jest + Testing Library, mock C-Gate.

**Spec:** `docs/superpowers/specs/2026-07-11-cgate-frontend-parity-design.md` (M8)

---

### Scope

1. Dual-mode toggle: **Operate** | **Commission**
2. Commission: **Inventory** (units table) + **Groups** workspace (flat filterable table + toolbar)
3. Bulk multi-select on/off/level via existing `control.setLevel`
4. Scan/refresh progress UI over existing Sync / tree reload / level hydrate
5. Richer unit inspector — **done** (tabbed `EntityPanel`)

### Non-goals

- Unit EEPROM / programming tabs
- Tag create/delete (M9)
- New C-Gate SCAN verb (use Sync + TREEXML refresh)
- Bulk write API on the command channel

---

### File map

| File | Role |
|---|---|
| `src/shared/types.ts` | Optional `UiMode` type |
| `src/renderer/components/ModeToggle.tsx` | Operate / Commission control |
| `src/renderer/components/InventoryTable.tsx` | Flat units table |
| `src/renderer/components/GroupsWorkspace.tsx` | Flat groups table + toolbar + multi-select |
| `src/renderer/App.tsx` | Mode state; swap main content; bulk helper; refresh progress |
| `src/renderer/styles.css` | Mode toggle, tables, toolbar |
| `docs/smoke-checklist-m8.md` | Live smoke steps |
| Tests under `tests/renderer/` | Mode, inventory, groups workspace |

---

### Task overview

| Task | Deliverable |
|---|---|
| 1 | `UiMode` + `ModeToggle` + App header wiring (Operate default) |
| 2 | `InventoryTable` from `tree` units; row selects unit |
| 3 | `GroupsWorkspace` flat table + filter |
| 4 | Multi-select + bulk On/Off/Level toolbar |
| 5 | Refresh/Scan progress tied to sync + tree reload |
| 6 | Styles polish + smoke checklist + tests green |

---

### Task 1: Mode toggle

**Files:**
- Create: `src/renderer/components/ModeToggle.tsx`
- Create: `tests/renderer/ModeToggle.test.tsx`
- Modify: `src/shared/types.ts`, `src/renderer/App.tsx`, `src/renderer/styles.css`

- [x] **Step 1:** Add `export type UiMode = 'operate' | 'commission'`
- [x] **Step 2:** Write failing test — ModeToggle calls `onChange('commission')` when Commission clicked
- [x] **Step 3:** Implement ModeToggle (`role="tablist"` or segmented control)
- [x] **Step 4:** Wire `uiMode` in App; show DeviceTree only when `operate`; placeholder when `commission`
- [x] **Step 5:** Commit

### Task 2: Inventory table

**Files:**
- Create: `src/renderer/components/InventoryTable.tsx`
- Create: `tests/renderer/InventoryTable.test.tsx`
- Modify: `App.tsx`

- [x] **Step 1:** Failing test — renders unit name/address; click selects unit
- [x] **Step 2:** Implement table from `tree.flatMap(n => n.units)` with filter input
- [x] **Step 3:** Commission mode shows Inventory (and later Groups); wire `onSelect`
- [x] **Step 4:** Commit

### Task 3: Groups workspace (read + filter)

**Files:**
- Create: `src/renderer/components/GroupsWorkspace.tsx`
- Create: `tests/renderer/GroupsWorkspace.test.tsx`
- Modify: `App.tsx` (export or pass `collectGroups`)

- [x] **Step 1:** Failing test — lists group label/address; filter narrows rows
- [x] **Step 2:** Implement flat table with columns: select, address, label, application, level/on
- [x] **Step 3:** Commission layout: tabs or split **Inventory | Groups** within commission mode
- [x] **Step 4:** Commit

### Task 4: Bulk multi-select control

**Files:**
- Modify: `GroupsWorkspace.tsx`, `App.tsx`
- Test: `tests/renderer/GroupsWorkspace.test.tsx`

- [x] **Step 1:** Failing test — selecting two rows and clicking Off calls `onBulkSetLevel` with both groups at 0
- [x] **Step 2:** Toolbar: On / Off / Level% (or slider) disabled when none selected
- [x] **Step 3:** App `bulkSetLevel(groups, level)` — sequential or concurrency≤4 `cgate().control.setLevel`; optimistic state; `setError` on failure
- [x] **Step 4:** Skip or disable bulk for trigger app `202` / non-lighting if easy; else document limitation
- [x] **Step 5:** Commit

### Task 5: Refresh progress

**Files:**
- Modify: `StatusBar.tsx` and/or Commission toolbar, `App.tsx`

- [x] **Step 1:** Commission “Refresh” button → existing `runNetOp('sync')` or tree-only reload (`loadTreeForNetwork`)
- [x] **Step 2:** Show progress/busy label while `netBusy` or connectBusy enrich
- [x] **Step 3:** Smoke note: Refresh ≠ Toolkit unit scan
- [x] **Step 4:** Commit

### Task 6: Polish + smoke

- [x] **Step 1:** CSS for tables (no overlapping cells; sticky header; selected row)
- [x] **Step 2:** `docs/smoke-checklist-m8.md`
- [x] **Step 3:** Full `npm test` green
- [x] **Step 4:** Final commit

---

### Already done (do not re-build)

- Tabbed `EntityPanel` (unit Summary/Status/Groups/All; group Live/Settings/All)
- M6 session project/network pickers
- M7 NET OPEN/CLOSE/SYNC, FORCE, activity drawer
- C-Gate 3.x list framing + DBGET path fix
