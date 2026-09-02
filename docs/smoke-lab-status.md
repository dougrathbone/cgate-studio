# Hardware / lab status (Approach A)

CBus Studio is tested in CI against an **in-process mock C-Gate**. Live CNI boxes cannot run in GitHub Actions or this cloud agent. This file records what is already proven vs what still needs a desk with C-Gate.

## Live C-Gate 3.3.2 (already recorded in plans / M4–M10 checklists)

| Item | Result |
|---|---|
| `GET //proj/net/* level` | Fails when any app lacks `level` (`402`) |
| `GET //proj/net/56/* level` | Works (`300-` continuations) |
| `TRIGGER EVENT //proj/net/202/g sel` | `200 OK` |
| `ID //proj/net/p/unit` | Verb exists; often `521` if unit unavailable |
| Tag rename | `DBSET //proj/net/app/group/TagName "Label"` (slash form) |
| Soft-delete | `DBSET …/TagName "<Unused>"` |
| `NEW GROUP` / `DBADD` / `DBDEL` | Not a TagName-DB create/delete path on 3.3.2 |

## Covered by automated tests (mock C-Gate + jsdom)

M1–M10 behaviours that the Jest suite already exercises: connect/tree, on/off/ramp, rename + `PROJECT SAVE`, trigger fire, measurement events, session pickers, NET OPEN/CLOSE/SYNC + FORCE, Operate/Commission UI, TagName + `<Unused>`, Identify + CSV export, `/` filter focus, M11 updater bind/IPC/banner.

## Still on-site (desk + CNI)

Every **unchecked** box in `docs/smoke-checklist-m1.md` … `-m10.md` — physical lights, Identify blink, Gatekeeper/SmartScreen, and a real `PROJECT SAVE` on a throwaway group.

M11 signing/notarization/auto-update: `docs/smoke-checklist-m11.md` after certificates exist and a signed tag is published.

## Intentionally not scheduled

- Unit programming / EEPROM
- Bundled C-Gate / JRE
- MQTT / Home Assistant
- Structural **Add group** in the TagName DB until C-Gate exposes a TCP create path
