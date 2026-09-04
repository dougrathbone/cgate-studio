# M14 — Commission Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Checkbox steps for tracking.

**Goal:** Richer Commission inventory, safer mismatch cues, inventory CSV export — still no unit programming or Add group.

**Architecture:** Prefer tree + cached params; optional explicit refresh for GET enrichment with progress. Export via existing dialog/IPC patterns. Mismatch cues are Commission-visible hints only.

**Tech Stack:** Electron IPC, `projectExport` (or sibling), React Commission views, mock C-Gate, Jest.

**Spec:** `docs/superpowers/specs/2026-09-04-m14-commission-depth-design.md`

## Global Constraints

- No EEPROM / programming / Transfer to Network
- No TagName Add group
- Exports are read-only; enrichment GETs must not DBSET or PROJECT SAVE
- No false-positive mismatch when either side empty
- Do not dirty project banner on GET refresh

---

### File map

| File | Role |
|---|---|
| `InventoryTable.tsx` | Extra columns (serial, firmware/version when known) |
| `CgateService` / IPC | Optional bulk or per-unit param refresh already used by EntityPanel — reuse |
| `EntityPanel` / mismatch helpers | Additional cue rules |
| `projectExport.ts` or `inventoryExport.ts` | Inventory CSV builder |
| `ipc.ts` / preload / App export menu | Wire “Export inventory…” |
| `docs/smoke-checklist-m14.md` | Desk checklist |
| Tests | Columns, mismatch matrix, CSV shape |

---

### Task overview

| Task | Deliverable |
|---|---|
| 1 | Inventory columns from tree/cached params + tests |
| 2 | Explicit refresh params (reuse GET) without dirty banner |
| 3 | Mismatch cue helpers + UI |
| 4 | Inventory CSV export + IPC |
| 5 | Smoke checklist + README one-liner + commit |

---

### Task 1: Inventory columns

- [ ] Add Serial / Firmware (or Version) columns; show `—` when unknown
- [ ] Use `formatUnitType` from M13 for Type column
- [ ] Tests with fixture units; commit `feat(ui): inventory serial and firmware columns`

---

### Task 2: Refresh params

- [ ] Commission toolbar or inventory action: refresh selected/all unit params via existing `getUnitParams`
- [ ] Progress or disabled state while in flight; errors inline
- [ ] Assert dirty banner unchanged (no project write)
- [ ] Commit `feat(commission): refresh unit params for inventory`

---

### Task 3: Mismatch cues

```ts
export function tagNameMismatch(tag: string | null, objectName: string | null): boolean {
  if (!tag?.trim() || !objectName?.trim()) return false;
  return tag.trim() !== objectName.trim();
}
```

- [ ] Extract/extend beyond EntityPanel; add tree-label vs TagName when both present
- [ ] Commission-only subtle hint; tests for show/hide matrix
- [ ] Commit `feat(ui): stronger tag mismatch cues in Commission`

---

### Task 4: Inventory CSV

CSV header (units): `network,address,type,typeLabel,serial,firmware,name`

- [ ] Builder function + Jest on header/rows
- [ ] IPC + save dialog filter `.csv`
- [ ] Menu or Commission export entry
- [ ] Commit `feat(export): inventory report CSV`

---

### Task 5: Docs close-out

- [ ] `docs/smoke-checklist-m14.md`
- [ ] README Commission bullet for inventory export
- [ ] Session-starter already points at M14 spec

---

### Spec coverage

| Spec item | Task |
|---|---|
| Inventory columns | 1 |
| Refresh without GET storm default | 2 |
| Mismatch cues | 3 |
| Inventory CSV | 4 |
| No programming / Add group | all |
| Smoke / README | 5 |
