# M9 — Tag DB Authoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Checkbox steps for tracking.

**Goal:** Let installers rename and soft-delete group TagNames in the C-Gate project DB, with all DB writes gated behind confirm-on-save (aligned with the dirty banner), plus light live-vs-tag mismatch cues.

**Architecture:** Extend `CgateService` with validated `DBSET …/TagName` writes (C-Gate 3.x slash form). Renderer stages label edits + marks dirty; `PROJECT SAVE` remains the only persist step behind confirm. Soft-delete uses Toolkit’s `<Unused>` convention. Structural create/delete of TagName-DB groups is **not available** via TCP on C-Gate 3.3.2 (see Task 1).

**Tech Stack:** Existing Electron IPC, React Commission UI, mock C-Gate, Jest.

**Spec:** `docs/superpowers/specs/2026-07-11-cgate-frontend-parity-design.md` (M9)

---

### Scope

1. Rename groups via TagName (`DBSET`) consistent with Toolkit / C-Gate 3.x
2. Soft-delete group labels (`DBSET …/TagName "<Unused>"`)
3. Dirty banner covers EntityPanel SETs that mutate project DB (not transient levels)
4. Mismatch cue: TagName vs Name when both present and differ
5. Confirm-on-save for `PROJECT SAVE` (already present; keep aligned)

### Non-goals / deferred

- **Structural create** of new TagName-DB groups/apps (no working TCP verb on 3.3.2)
- **Hard delete** of TagName-DB rows (`DBDEL` / `DBADD` unavailable)
- Unit programming / EEPROM
- Ungated auto-save
- Full Toolkit tag editor

---

### Task overview

| Task | Deliverable |
|---|---|
| 1 | Live spike: confirm create/delete/rename command strings |
| 2 | CgateService + mock + IPC for setTagName / clearTagName |
| 3 | Dirty-model: EntityPanel project SETs mark dirty |
| 4 | Commission UI: clear-label delete (+ rename already wired) |
| 5 | Mismatch cue in EntityPanel Settings |
| 6 | Tests, smoke checklist, docs |

---

### Task 1: Live command spike

- [x] Probed C-Gate **3.3.2** (`192.168.0.22`) project `5COGAN`
- [x] Documented chosen verbs below

#### Confirmed commands (C-Gate 3.3.2)

| Action | Command | Notes |
|---|---|---|
| Read tag | `DBGET //proj/net/app/group/TagName` | Slash form; space form is legacy |
| Rename tag | `DBSET //proj/net/app/group/TagName "Label"` | Space + quotes after `/TagName`. **Not** `TagName="…"` |
| Soft-delete | `DBSET //proj/net/app/group/TagName "<Unused>"` | cgateweb / Toolkit convention |
| Persist | `PROJECT SAVE [proj]` | Confirm-gated in UI |
| Runtime name | `SET //proj/net/app/group Name "…"` | Object param; may diverge from TagName |

#### Rejected / unavailable

| Attempt | Result |
|---|---|
| `DBSET //path TagName="…"` (space form) | `401 Field not found` on 3.3.2 |
| Bare `DBSET …/TagName` (no value) | Clears tag — **do not use** on live sites |
| `NEW GROUP //path` | Creates **runtime** object only; not in TagName DB; not in TREEXML |
| `DBSET` on NEW GROUP address | `401 Element N not found` (TagName DB has no row) |
| `DBADD` / `DBDEL` | No working surface found on this server |

**Implication:** M9 ships rename + soft-delete + dirty/mismatch. “Add group” stays deferred until a TagName-DB create path exists (Toolkit / future C-Gate).

---

### Task 2: Service layer

**Files:** `CgateService.ts`, `mockCgate.ts`, `ipc.ts`, `preload`, `api.ts`

- [x] `setTagName(ref, name)` → `DBSET ${path}/TagName ${formatCgateSetValue(name)}`
- [x] `clearTagName(ref)` → `DBSET ${path}/TagName "<Unused>"` (or empty → Unused)
- [x] Wire `labels.rename` to prefer `setTagName` (keep `SET Name` optional sync or drop)
- [x] Mock accepts `DBSET …/TagName …` and records commands
- [x] Unit tests (TDD)

---

### Task 3: Dirty alignment

- [x] EntityPanel `RampTime` / `EventLevel` / `Protected` / Name → mark dirty via callback
- [x] Banner copy: “unsaved project change(s)” (not only “label”)
- [x] Unit name: mark dirty too if it hits project DB

---

### Task 4: Commission UI

- [x] Groups workspace: **Clear label** on selected (confirm dialog) → `clearTagName` + dirty + refresh label
- [x] Rename continues via existing tree/inspector paths (now TagName-backed)
- [x] Do **not** ship “Add group” until create is possible (show disabled + tooltip, or omit)

---

### Task 5: Mismatch cue

- [x] Fetch TagName (from tree label / DBGET) vs `GET Name`; if both non-empty and differ, show subtle hint on Settings

---

### Task 6: Polish

- [x] `docs/smoke-checklist-m9.md`
- [x] Update AGENTS.md “rename-only” line to reflect soft-delete + TagName writes
- [x] Full test suite + commit

---

### Safety

- Never `PROJECT SAVE` without confirm
- Soft-delete requires explicit confirm
- Never send bare `DBSET …/TagName` without a value on live projects
- Copy must not claim unit programming or structural TagName create
