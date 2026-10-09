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

## Live wire reconfirm (2026-09-04, C-Gate 3.3.2 @ desk)

Read-only TCP probe against project `5COGAN` / network `254`:

| Item | Result |
|---|---|
| Service greeting | `201` C-Gate v3.3.2 build 1855 |
| `PROJECT LIST` | `123 project=5COGAN state=started` |
| `NET LIST` | `131 network=254 State=ok InterfaceState=running` |
| `GET //5COGAN/254/56/* level` | 70× `300-` level rows |
| `GET //5COGAN/254/* level` | `402` (apps without `level`) |
| `TREEXML //5COGAN/254` | XML snippet begins (`343` / `347`) |
| `DBGET …/TagName` | e.g. `342 …/TagName=Main bed blind Southside` |

## Live wire reconfirm (2026-09-12, same desk)

Same host/project/net; still C-Gate **3.3.2 build 1855**. Reconfirmed greeting, `PROJECT LIST`, `NET LIST`, per-app levels, network-wide `402`, `TREEXML` (~60 units), and `DBGET …/TagName`.

| Item | Result |
|---|---|
| `GET //5COGAN/254/p/0 SerialNumber` | `300` → `100928.2326` |
| `GET //5COGAN/254/p/0 FirmwareVersion` | `300` → `01.03.00` |
| `GET //5COGAN/254/p/0 Type` | `300` → `KEYGL5` |
| `ID //5COGAN/254/p/0` | `521 Unit unavailable: Identify failed` (expected soft failure) |
| `TREE //5COGAN/254` | Unit list starts at `p/0` KEYGL5; CNI `192.168.0.2:10001` ok |

**Still needs a human at the desk (UI / physical):** M8–M10 / M14 checklist boxes — Operate/Commission UI, bulk On/Off, rename + `PROJECT SAVE`, Identify blink when a unit supports it, CSV exports, filter keyboard, inventory Refresh params / export.

## Covered by automated tests (mock C-Gate + jsdom)

M1–M10 behaviours that the Jest suite already exercises: connect/tree, on/off/ramp, rename + `PROJECT SAVE`, trigger fire, measurement events, session pickers, NET OPEN/CLOSE/SYNC + FORCE, Operate/Commission UI, TagName + `<Unused>`, Identify + CSV export, `/` filter focus, M11 updater bind/IPC/banner.

## M11 distribution (CI, v1.3.2)

| Item | Result |
|---|---|
| Unsigned macOS / Windows / Linux installers | **Proven** — secrets unset; artifacts + `latest*.yml` published |
| Signed / notarized macOS | **Blocked** — `MACOS_CSC_LINK` (and Apple notary secrets) not configured |
| Authenticode Windows | **Blocked** — `WIN_CSC_LINK` not configured |
| Auto-update metadata | **Proven** — `latest-mac.yml` / `latest.yml` / `latest-linux.yml` for 1.3.2 |
| `npm run verify-release -- v1.3.2` | **Proven** (M12) — assets + updater YAML; signing status warns `unsigned` |
| Auto-update N→N+1 desk path | Still on-site (install older build, launch after newer tag) |

See `docs/smoke-checklist-m11.md` and `docs/context/code-signing.md`.

## Still on-site (desk + CNI)

Every **unchecked** box in `docs/smoke-checklist-m1.md` … `-m10.md` — physical lights, Identify blink, Gatekeeper/SmartScreen, and a real `PROJECT SAVE` on a throwaway group.

M11 signing/notarization and N→N+1 auto-update: remaining boxes in `docs/smoke-checklist-m11.md` after certificates exist.

## Intentionally not scheduled

- Unit programming / EEPROM
- Bundled C-Gate / JRE
- MQTT / Home Assistant
- Structural **Add group** in the TagName DB until C-Gate exposes a TCP create path
