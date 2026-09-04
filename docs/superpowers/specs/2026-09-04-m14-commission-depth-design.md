# CBus Studio — M14 Commission Depth

**Date:** 2026-09-04  
**Status:** Approved (design)  
**Depends on:** M8 Commission UI, M9 tags, M10 diagnostics, entity inspector tabs  
**Related:** `docs/superpowers/specs/2026-07-11-cgate-frontend-parity-design.md` (Approach A; no programming)

## Goal

Deepen **Commission** mode using data C-Gate already returns — so installers get better inventory insight and reports — without Toolkit programming:

1. Richer inventory columns / unit Summary from existing `GET` params.
2. Stronger live-vs-tag mismatch cues beyond today’s TagName vs Name hint.
3. A **report/export pack** (inventory-oriented CSV/summary) beside existing tag CSV / XML / CBZ.

## Non-goals

- Unit EEPROM / programming / Transfer to Network
- TagName-DB structural **Add group** (still blocked on C-Gate 3.3.2)
- Bundled C-Gate, MQTT/HA, serial PCI
- Full Toolkit diagnostics clone
- Changing confirm-on-save rules for DB writes

## Inventory & inspector

### Inventory table

- Add optional columns from tree + last-known params when cheap: firmware/version, serial (when previously fetched), online/state-ish fields if present on the unit node or cached params.
- Avoid N+1 `GET` storms on every inventory open: prefer data already on the tree; offer explicit **Refresh params** (or reuse existing scan/refresh) for bulk enrichment with progress.
- Column set stays skimmable; advanced keys remain on inspector **All**.

### Unit inspector

- Summary/Status tabs: include a few more curated keys from the M8/tabs heuristic lists when present (no new programming tabs).
- Loading/error unchanged in spirit; long keys keep the grid wrap fix from the tabs work.

## Mismatch cues

- Keep TagName vs object Name hint (M9).
- Add subtle cues when safe comparisons exist, e.g.:
  - Tree label vs TagName after hydrate
  - Reported `State` / presence vs inventory expectations when both available
- Never block Operate controls on mismatch; Commission-only visual hint.
- No false positives: if either side empty/unknown, stay quiet.

## Report / export pack

- New export flavor: **Inventory report** (CSV): network, unit address, type (raw + label if M13 map exists), serial, firmware/version, name/label when known.
- Groups optional second sheet/file or separate “Groups report” CSV: address, application, TagName, level if known — only if it stays a thin addition; otherwise ship units inventory first.
- Reuse existing save dialog / IPC export patterns (`project:export` or sibling channel); confirm no auto-save.
- XML/CBZ/tag CSV remain.

## Safety

- Exports are read-only snapshots.
- Any future enrichment that issues `GET` must not issue `DBSET` / `PROJECT SAVE`.
- UI copy must not imply unit programming capability.

## Testing

- Mock C-Gate: inventory columns render from fixture params.
- Mismatch cue unit tests (show / hide matrix).
- Export CSV header + row shape tests.
- Smoke checklist M14: desk export opens; refresh params does not dirty the project banner.

## Success criteria

1. Commission inventory shows at least one useful extra identity/health column without programming UI.
2. Mismatch cues appear only when both sides are present and disagree.
3. User can save an inventory CSV from the app.
4. Approach A non-goals unchanged in README / session-starter.
