# M5 Smoke / Validation Checklist — against a live C-Gate

> Run against your live C-Gate (target host recorded in the local design spec, not committed here).

## Sensors / Measurement (app 228)
- [ ] **VALIDATE@live-cgate — measurement event format.** With a measurement
      device on the network, watch the event stream and confirm the line format.
      Working assumption: `measurement [//PROJECT/]<net>/228/<channel> <value> [units=<u>]`
      (see `src/main/measurementParse.ts`). If different (token, value position,
      units encoding), adjust `parseMeasurementEvent` only.
- [ ] Sensor values appear in the Sensors section and update live.
- [ ] Units render usefully (note the real units encoding for a follow-up that maps codes to labels).

## Bulk hydration
- [ ] **VALIDATE@live-cgate — bulk level query.** Confirm the bulk form C-Gate
      accepts for all group levels on a network. Working assumption:
      `GET //<project>/<net>/* level` (see `CgateService.bulkLevelCommand`). If
      different, adjust `bulkLevelCommand` only. Confirm initial levels populate
      on connect and that an unsupported form falls back to per-group enrichment
      without error.
  - **Framing note:** Confirm C-Gate frames a multi-object `GET .../* level` reply as `300-` continuation lines
    terminated by a final status line (matching TREEXML framing). If instead it sends multiple terminal `300 `
    lines, `CgateService.sendCommand` will capture only the first — the per-group enrichment fallback still
    fills the rest, but `getNetworkLevels` would need a multi-line collection adjustment to get the full benefit.

## Regression
- [ ] Lighting, scenes (M4), rename + PROJECT SAVE all still work.
- [ ] Unit detail (tree + EntityPanel) still shows type/firmware/serial/params.
