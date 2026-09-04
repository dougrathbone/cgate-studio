# M13 — Operate Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Checkbox steps for tracking.

**Goal:** Readable unit/measurement labels, clearer filter empty states, light keyboard polish — Operate-only.

**Architecture:** Static maps in `src/shared/` (or `src/renderer/labels/`) consumed by DeviceTree, InventoryTable, EntityPanel, Sensors UI. No new C-Gate I/O.

**Tech Stack:** React renderer, Jest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-09-04-m13-operate-polish-design.md`

## Global Constraints

- Unknown codes pass through raw — never block render
- No full Clipsal catalogue
- No Commission inventory redesign (M14)
- No new DB writes / C-Gate verbs

---

### File map

| File | Role |
|---|---|
| `src/shared/unitTypeLabels.ts` | `formatUnitType(code): string` |
| `src/shared/measurementUnitLabels.ts` | `formatMeasurementUnit(raw): string` |
| `DeviceTree.tsx` / `InventoryTable.tsx` / `EntityPanel.tsx` | Display formatted types |
| Sensors section in DeviceTree (or sensor component) | Formatted units |
| Filter empty UI | “No matches” copy |
| `useFilterHotkeys` / list selection | Arrow keys where selection exists |
| Tests under `tests/shared/`, `tests/renderer/` |

---

### Task overview

| Task | Deliverable |
|---|---|
| 1 | Unit type label map + tests + wire tree/inventory/Summary |
| 2 | Measurement unit map + Sensors display |
| 3 | Filter empty state + placeholder `/` hints |
| 4 | ArrowUp/Down in filtered lists with selection (if model exists); else document skip |
| 5 | Commit + smoke note |

---

### Task 1: Unit type labels

**Seed map** (extend from fixtures / live 5COGAN): at least `KEYGL5` → something like `Key input (KEYGL5)`; add 3–8 other codes from `tests/` fixtures / TREEXML samples.

```ts
export function formatUnitType(code: string | null | undefined): string {
  if (!code) return '—';
  const label = UNIT_TYPE_LABELS[code.toUpperCase()];
  return label ? `${label} (${code})` : code;
}
```

- [ ] Failing tests: mapped, unknown, empty
- [ ] Implement map + `formatUnitType`
- [ ] Replace raw `u.type` displays in DeviceTree UnitDetail, InventoryTable type column, EntityPanel Summary Type row
- [ ] Tests green; commit `feat(ui): human-readable unit type labels`

---

### Task 2: Measurement units

- [ ] Inspect `measurementParse` / sensor display for current `units` field
- [ ] Map known encodings; unknown → raw
- [ ] Wire Sensors section; tests; commit `feat(ui): friendly measurement unit labels`

---

### Task 3: Filter empty + placeholders

- [ ] When `filtering && shownCount === 0`, show “No matches” in DeviceTree (and Groups/Inventory if applicable)
- [ ] Placeholder text includes “Press / to focus” where missing
- [ ] Component tests; commit `fix(ui): clearer filter empty states`

---

### Task 4: Arrow navigation

- [ ] Read GroupsWorkspace / InventoryTable selection model
- [ ] If a selected index exists, ArrowUp/Down when filter focused moves selection and prevents page scroll
- [ ] If no clean selection model, skip with a one-line note in the plan checkbox and Spec success still met via tasks 1–3
- [ ] Commit if implemented

---

### Spec coverage

| Spec item | Task |
|---|---|
| Unit Type labels | 1 |
| Measurement units | 2 |
| Filter empty / placeholders | 3 |
| Arrow keys | 4 (best-effort) |
| Jest maps | 1–2 |
