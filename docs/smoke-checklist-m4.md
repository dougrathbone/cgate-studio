# M4 Smoke / Validation Checklist — against a live C-Gate

> Run against your live C-Gate (target host is recorded in the local design spec, not committed here).

Build-first items to confirm on real hardware. Each ✅ either confirms the
working assumption or records the correction (and the one-line code change).

## Scenes (Trigger Control, app 202)
- [ ] Trigger groups appear in the tree under "Trigger Control".
- [ ] **VALIDATE@live-cgate — fire command.** With a C-Gate session log open,
      fire a scene from the UI. Confirm the exact line C-Gate accepts.
      Working assumption: `TRIGGER EVENT //<project>/<net>/202/<group> <selector>`
      (see `CgateService.sceneCommand`). If different, update `sceneCommand()` only.
  - **Live note (3.3.2):** `TRIGGER EVENT //5COGAN/254/202/1 0` → `200 OK` — assumption confirmed.
- [ ] Firing produces the expected physical scene change.
- [ ] **VALIDATE@live-cgate — trigger event shape.** Confirm the event-stream
      line C-Gate emits for a trigger (device type token + selector position),
      and that the "last fired" indicator updates. Adjust `handleEventData` /
      `CBusEvent` only if the token isn't `trigger` or the selector isn't the
      trailing integer.

## 742 live events
- [ ] **VALIDATE@live-cgate — 742 format.** Rename/create a group in Toolkit
      (or another C-Gate client) while CBus Studio is connected. Confirm a `742`
      line arrives and the tree re-fetches within ~0.5 s. Adjust the network
      regex in `handleEventData` if the address format differs.

## Regression
- [ ] Lighting on/off/ramp/stop still work (Task 2 did not disturb lighting state).
- [ ] Rename + PROJECT SAVE still work.
