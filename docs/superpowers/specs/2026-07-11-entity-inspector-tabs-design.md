# Entity inspector — Toolkit-style tabs

**Date:** 2026-07-11  
**Status:** Approved (layout B; scope unit + group)  
**Related:** `docs/superpowers/specs/2026-07-11-cgate-frontend-parity-design.md` (M8 richer unit inspector; no programming)

## Goal

Replace the flat, overlapping parameter table in `EntityPanel` with a Toolkit-inspired **tabbed inspector** for both **units** and **groups**, while keeping CBus Studio’s Control Console look (not Win32 chrome).

## Non-goals

- Unit EEPROM / programming tabs (Toolkit / SpaceLogic remain the programmers)
- Changing C-Gate fetch APIs beyond what’s needed to present existing `GET *` params
- Redesigning the main tree or session chrome

## Layout

### Shared shell

- Keep the right-hand `EntityPanel` (sticky header + close).
- Under the title/subtitle, a horizontal **tab bar**.
- Active tab: bottom accent border; inactive: muted text.
- Panel width may increase slightly (e.g. ~360 → ~400px) if needed for tabs; avoid horizontal scroll of the panel itself.

### Unit tabs

| Tab | Content |
|---|---|
| **Summary** | Identity cards: CatalogNumber, Serial, Firmware/Version, Type/PartName (from tree + params). Editable **Name** when connected. Short Toolkit hint. |
| **Status** | Health / boolean-ish params: e.g. MainsPresent, NetVoltage, BurdenActive, ClockGenActive, LearnEnable, State, Online-style fields when present. Present as labeled rows or compact status chips (yes/no → clear wording). |
| **Groups** | Parse `Groups` (and Applications if present) into chips / a compact list. Empty state if none. |
| **All** | Full sorted param dump for power users / unknown keys. |

### Group tabs

| Tab | Content |
|---|---|
| **Live** | Existing On/Off + level slider (when `actions` provided). |
| **Settings** | Editable Name, RampTime, EventLevel, Protected (unchanged commit behavior). Readonly Type, State, Units, Level. |
| **All** | Remaining / full params. |

Default tab: **Summary** (unit) / **Live** (group, if controls available, else **Settings**).

## Overlap fix (required)

Current CSS uses a fixed `110px` label column; long keys (e.g. `FARQChannelSpecificRatingFlag`) collide with values.

**All param rows** (including All tab) must use:

- CSS grid: `grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr)` (or equivalent)
- Labels: `overflow-wrap: anywhere` (or break long CamelCase)
- Values: mono font, `overflow-wrap: anywhere`, no clipping under labels
- Adequate row gap; no absolute positioning

## Param classification (units)

Heuristic buckets from known C-Gate keys (case-insensitive); anything unmatched goes to **All** (and still appears only once across tabs — Summary/Status/Groups show curated subsets, All shows everything).

- **Summary identity:** Name, CatalogNumber, Serial, Type, PartName, Version, Firmware, ProjectName, ClassName (ClassName optional on Summary or All-only if too long)
- **Status:** MainsPresent, NetVoltage, BurdenActive, ClockGenActive, LearnEnable, State, and similar yes/no or voltage fields
- **Groups:** Groups, Application(s) — parsed for chips; raw string also in All

Groups use existing editable/readonly lists; no new SET surface beyond today.

## Behavior

- Loading / error handling unchanged (`getUnitParams` / `getGroupParams`).
- Name (and group Settings) commit-on-blur / Enter unchanged.
- Tab selection is local UI state; reset when `selection` changes.
- Accessibility: tabs as `tablist` / `tab` / `tabpanel` with keyboard Left/Right where practical.

## Testing

- Unit test: long param key does not require fixed 110px column (render All tab; assert structure/classes).
- Unit test: unit selection shows Summary/Status/Groups/All; group shows Live/Settings/All.
- Existing EntityPanel rename / load tests updated for new markup (find by role/label).

## Success criteria

1. Opening Unit 61 (DIM2) shows tabbed Summary with catalog/serial readable; no overlapping text on All.
2. Group selection keeps live controls on Live tab; settings still editable.
3. Visual language matches CBus Studio tokens; IA feels Toolkit-like without Win32 chrome.
