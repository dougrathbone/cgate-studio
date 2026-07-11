# Smoke checklist — M9 Tag DB authoring

Against a live C-Gate 3.x (or mock) with a disposable project / known-safe groups.

## Rename (TagName)

- [ ] Connect → Operate or Commission → rename a group label in the tree
- [ ] Confirm command path uses `DBSET //proj/net/app/group/TagName "…"` (not space-form `TagName="…"`)
- [ ] Banner shows “unsaved project change(s)”
- [ ] **Save to project** → confirm → `PROJECT SAVE`; banner clears
- [ ] Reconnect / refresh: new label still present

## Soft-delete

- [ ] Commission → Groups → select one labelled group → **Clear label** → confirm
- [ ] Label clears in UI; banner dirty
- [ ] Save with confirm
- [ ] Tag reads as unused / blank after refresh (do not use bare `DBSET …/TagName` with no value)

## Dirty alignment

- [ ] EntityPanel Settings: change `RampTime` / `EventLevel` / `Protected` → banner dirty
- [ ] Unit name change → banner dirty
- [ ] Transient On/Off / level does **not** mark dirty

## Mismatch cue

- [ ] If TagName ≠ object `Name`, Settings shows a subtle hint (both non-empty)

## Safety

- [ ] Never auto-save; Confirm save required
- [ ] Clear label requires confirm dialog
- [ ] No “Add group” claiming TagName-DB create (deferred on C-Gate 3.3.2)

## Regression

- [ ] List projects / networks still populate on C-Gate 3.x
- [ ] M8 bulk On/Off/50% still works
