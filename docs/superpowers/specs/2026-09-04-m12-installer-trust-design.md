# CBus Studio — M12 Installer Trust (secrets deferred)

**Date:** 2026-09-04  
**Status:** Approved (design)  
**Depends on:** M11 distribution (shipped in 1.3.x)  
**Related:** `docs/context/code-signing.md`, `docs/smoke-checklist-m11.md`, `docs/smoke-lab-status.md`

## Goal

Make installer trust **ready to flip on** when Apple / Windows certificates appear, without pretending builds are signed today.

1. Exact, copy-pasteable secret setup in `code-signing.md` (`gh secret set` examples).
2. A **verify-release** helper that checks a published `v*` tag’s assets and updater metadata.
3. Optional local hints for `codesign` / `spctl` / Authenticode when a signed artifact exists.
4. Keep unsigned fallback as the default; never claim signed when CI ran unsigned.

## Non-goals

- Purchasing or storing certificates in git
- Configuring GitHub secrets from this agent (operator must paste secrets)
- Live notarization / SmartScreen proof until secrets exist
- Changing auto-update provider or release channel model

## Deliverables

### Docs

- Expand `docs/context/code-signing.md` with:
  - Prerequisites (Apple Developer Program, Developer ID Application; Windows Authenticode / EV note)
  - `gh secret set NAME --repo dougrathbone/cgate-studio < file` examples for each secret
  - Post-secret checklist: retag or `workflow_dispatch` Release on an existing tag; confirm release body **This release signing status** shows `signed`
- Point `docs/smoke-checklist-m11.md` signed sections at the verify helper

### `scripts/verify-release.sh` (or `.mjs`)

Given a tag (default: latest `v*`):

| Check | Pass criteria |
|---|---|
| Assets | `.dmg`, `-mac.zip`, Windows `.exe`, `.AppImage` present |
| Updater | `latest-mac.yml`, `latest.yml`, `latest-linux.yml` present and `version` matches tag |
| Blockmaps | Present when electron-builder emitted them for that platform |
| Signing status | Parse release notes for `This release signing status` if present; else report `unknown` |
| Optional mac | If `.dmg` downloaded and `codesign` available: report identity or “unsigned / no identity” |
| Optional win | Document `signtool verify` / Properties path; do not require Windows host for CI |

Exit non-zero if required assets or updater YAMLs are missing. Signing absence is a **warning**, not a failure, until secrets are expected.

### Tests

- Jest (or shell under CI) covering YAML version parse helpers if logic lives in JS
- Distribution config test already asserts release workflow signing-status strings — keep green

## Success criteria

1. An operator can follow `code-signing.md` and add secrets without reading the workflow YAML.
2. `npm run verify-release` (or `./scripts/verify-release.sh v1.3.2`) passes asset/updater checks on current releases.
3. When secrets are later added, the same script’s optional signing probes become the desk proof path; no redesign required.

## Out of scope until secrets exist

- Marking M11 signed checklist boxes `[x]`
- Cutting a “first signed” release solely for this milestone
