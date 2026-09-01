# M11 — Distribution Implementation Plan

**Goal:** Wire code signing, macOS notarization, GitHub auto-update, and a Linux AppImage without blocking unsigned releases.

**Spec:** `docs/superpowers/specs/2026-09-01-m11-distribution.md`

## Task overview

| Task | Deliverable |
|---|---|
| 1 | `electron-builder.yml`: GitHub publish metadata, mac entitlements, Linux AppImage, drop hard-coded `identity: null` |
| 2 | Release workflow: sign/notarize when secrets exist; always upload updater YAML + blockmaps |
| 3 | `electron-updater` in main + IPC + Help menu + renderer banner |
| 4 | Docs: README, session-starter, signing guide, smoke/lab status |
| 5 | Tests for updater bind, IPC, preload, UpdateBanner |

## Notes

- Certificates live only in GitHub Actions secrets. This environment cannot notarize.
- Hardware smoke for M1–M10 stays on-site; lab status records what CI vs live C-Gate already proved.
