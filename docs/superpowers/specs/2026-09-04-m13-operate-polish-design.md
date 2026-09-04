# CBus Studio — M13 Operate Polish

**Date:** 2026-09-04  
**Status:** Approved (design)  
**Depends on:** M1–M10 Operate surfaces (tree, sensors, filters)  
**Related:** `docs/smoke-checklist-m5.md` (units encoding follow-up)

## Goal

Make day-to-day **Operate** mode clearer and faster without new C-Gate verbs:

1. Map known unit types and measurement unit encodings → human-readable labels.
2. Tighten keyboard / filter affordances where M10 left gaps.
3. Clearer empty and error states when connected but idle, or when loads fail.

## Non-goals

- Commission inventory redesign (M14)
- New C-Gate commands or DB writes
- Full Clipsal catalogue / Toolkit unit database
- Redesigning the Control Console visual language

## Unit & measurement labels

### Unit `Type` (tree + inventory + inspector Summary)

- Maintain a small static map in renderer (or shared `src/shared/`) from known TREEXML / GET `Type` / `PartName` tokens (e.g. `KEYGL5`, DIMMER family codes observed in fixtures and live `5COGAN`) → short labels (“Key input”, “Dimmer”, …).
- Display: **Label (CODE)** when mapped; raw code alone when unknown.
- Do not invent labels for unknown codes; never block rendering on missing map entries.
- Seed map from mock fixtures + live types already seen; extend opportunistically — not a complete Clipsal catalogue.

### Measurement units (app 228)

- Map numeric / short `units=` encodings from the event stream to readable strings when known (from live notes + fixtures).
- Unknown → show raw token; Sensors section must not blank out.

## Keyboard & filter

- Keep `/` → focus active filter; Escape clears when filter focused (M10).
- Add: when tree/groups/inventory filter is focused, **ArrowUp/ArrowDown** move selection within the visible filtered list where a selection model already exists; do not invent multi-pane focus trapping.
- Ensure filter placeholders mention `/` where missing.
- No global vim-mode or command palette in this milestone.

## Empty & error states

| Situation | Behaviour |
|---|---|
| Connected, no project/network loaded | Keep accurate empty tree copy (already partly done); ensure sidebar/session prompts the next action once |
| Tree/levels/params fetch failed | Inline error with retry where a refresh action exists; no silent empty |
| Filter matches nothing | Explicit “No matches” (not a blank tree) |
| Sensors with no channels | Existing empty section OK; show units label mapping when values exist |

## Testing

- Unit tests for label maps (known → label, unknown → passthrough).
- Component tests: filter empty state; unit type displays mapped label.
- No hardware required for CI.

## Success criteria

1. A KEYGL-style unit shows a readable type in tree/inventory/Summary, with code still visible.
2. Sensor values with known units encodings show a friendly unit string.
3. Filtering to zero hits shows a clear empty message.
4. Jest coverage for maps and UI copy stays green under the 80% floor.
