# Smoke checklist — M10 Diagnostics polish

Against a live C-Gate 3.x (or mock).

## Bulk levels (M5 harden)

- [x] **Live confirmed (3.3.2; reconfirmed 2026-09-04 on 5COGAN):** `GET //proj/net/* level` fails when any app lacks `level`
- [x] **Live confirmed (reconfirmed 2026-09-04):** `GET //proj/net/56/* level` works (`300-` continuations; 70 groups sampled)
- [ ] Connect → levels hydrate for lighting groups without waiting on per-group enrichment alone
- [ ] Apps without level (e.g. 202) are skipped without error banner

## Scenes (M4 harden)

- [x] **Live confirmed:** `TRIGGER EVENT //proj/net/202/g sel` → `200 OK`
- [ ] Fire a scene from UI; last-fired indicator updates if event stream emits trigger

## Identify

- [ ] Unit Summary → **Identify** sends `ID //proj/net/p/unit`
- [ ] Unavailable units show a clear message (often `521 Identify failed`) — not a crash
- [ ] Successful identify blinks/indicates on the physical unit when supported

## CSV export

- [ ] Export → save as `.csv`
- [ ] File has header `network,application,group,address,label` and expected rows
- [ ] XML/CBZ export still works

## Keyboard

- [ ] Press `/` focuses the visible filter (Operate tree or Commission tables)
- [ ] Escape in the filter clears and blurs
- [ ] Typing `/` inside another input does not steal focus

## Regression

- [ ] M8 bulk On/Off, M9 rename/clear-label + confirm save still work
- [ ] Status bar / activity drawer unchanged in role
