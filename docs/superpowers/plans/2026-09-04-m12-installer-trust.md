# M12 — Installer Trust Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Checkbox steps for tracking.

**Goal:** Make installer trust ready to enable when certs appear: verify-release helper, expanded secret docs, no fake signed claims.

**Architecture:** Pure docs + a Node/shell verifier that uses `gh` against GitHub Releases. No Electron runtime changes. Unsigned remains the default CI path.

**Tech Stack:** Node (fetch release JSON via `gh`), Jest for parse helpers, existing Release workflow.

**Spec:** `docs/superpowers/specs/2026-09-04-m12-installer-trust-design.md`

## Global Constraints

- Never claim a build is signed when CI ran unsigned
- Do not purchase or commit certificates
- Signing absence = warning; missing assets/updater YAML = failure
- Secrets deferred — no live notarization required to complete M12

---

### File map

| File | Role |
|---|---|
| `scripts/verify-release.mjs` | CLI: check tag assets + latest*.yml |
| `src/shared/releaseVerify.ts` (or under `scripts/lib/`) | Pure helpers: parse version from yml, required asset names |
| `tests/scripts/verify-release.test.ts` | Unit tests for helpers |
| `package.json` | `"verify-release": "node scripts/verify-release.mjs"` |
| `docs/context/code-signing.md` | `gh secret set` examples + post-secret checklist |
| `docs/smoke-checklist-m11.md` | Point signed sections at verify helper |

---

### Task overview

| Task | Deliverable |
|---|---|
| 1 | Parse helpers + Jest tests |
| 2 | `scripts/verify-release.mjs` + npm script |
| 3 | Expand code-signing.md + smoke checklist pointers |
| 4 | Run against `v1.3.2`, commit |

---

### Task 1: Release verify helpers

**Files:** Create `scripts/lib/releaseVerify.mjs` (or `.ts` compiled via ts-jest if preferred — prefer plain `.mjs` + duplicate tiny helpers tested by importing the same file), Test: `tests/scripts/verify-release.test.ts`

Prefer **one** `scripts/lib/releaseVerify.mjs` exporting:

```js
export function tagToVersion(tag) { /* v1.3.2 → 1.3.2 */ }
export function requiredAssetPatterns(version) {
  return [
    new RegExp(`CBus\\.Studio-${version.replace(/\./g, '\\.')}-universal\\.dmg`),
    new RegExp(`CBus\\.Studio-${version.replace(/\./g, '\\.')}-universal-mac\\.zip`),
    new RegExp(`CBus\\.Studio\\.Setup\\.${version.replace(/\./g, '\\.')}\\.exe`),
    new RegExp(`CBus\\.Studio-${version.replace(/\./g, '\\.')}\\.AppImage`),
  ];
}
export function parseUpdaterVersion(ymlText) {
  const m = /^version:\s*(.+)$/m.exec(ymlText);
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : null;
}
export function parseSigningStatus(releaseBody) {
  const m = /This release signing status:\s*macOS\s+\*\*(\w+)\*\*,\s*Windows\s+\*\*(\w+)\*\*/i.exec(releaseBody || '');
  return m ? { mac: m[1].toLowerCase(), win: m[2].toLowerCase() } : { mac: 'unknown', win: 'unknown' };
}
```

- [x] Write failing tests for `tagToVersion`, `requiredAssetPatterns` match on real 1.3.2 names, `parseUpdaterVersion`, `parseSigningStatus`
- [x] Implement helpers
- [x] `npm test -- --testPathPattern=verify-release` green
- [x] Commit: `test: add release verify helpers for M12`

---

### Task 2: CLI

**Files:** `scripts/verify-release.mjs`, `package.json`

- [ ] CLI args: optional tag (default: resolve via `gh release view --json tagName` latest, or require explicit tag)
- [ ] `gh release view TAG --json assets,body,tagName`
- [ ] Download or `gh api` raw content for `latest-mac.yml` / `latest.yml` / `latest-linux.yml` from that release
- [ ] Fail if any required asset pattern missing or updater version ≠ tag version
- [ ] Warn (exit 0 still, or exit 0 with stderr warnings) if signing status is `unsigned`/`unknown`
- [ ] Optional: if `--check-codesign` and `.dmg` downloaded, run `codesign -dv` on mounted/extracted app — skip if not macOS
- [ ] Add npm script `verify-release`
- [ ] Commit: `feat(dist): add verify-release script for GitHub installer assets`

---

### Task 3: Docs

**Files:** `docs/context/code-signing.md`, `docs/smoke-checklist-m11.md`

- [ ] Add `gh secret set MACOS_CSC_LINK --repo dougrathbone/cgate-studio < <(base64 < cert.p12)` style examples for all seven secrets
- [ ] Post-secret: re-run Release via `gh workflow run release.yml -f tag=vX.Y.Z` or new tag; confirm body shows `signed`
- [ ] Smoke M11 signed sections: “Run `npm run verify-release -- vX.Y.Z` then codesign/spctl locally”
- [ ] Commit: `docs: expand code-signing secret setup for M12`

---

### Task 4: Verify live + close

- [ ] `npm run verify-release -- v1.3.2` passes assets/updater (warns unsigned)
- [ ] Update `docs/smoke-lab-status.md` one line: verify-release proven on v1.3.2
- [ ] Final commit if needed

---

### Spec coverage

| Spec item | Task |
|---|---|
| Secret setup docs | 3 |
| verify-release assets + yml | 1–2 |
| Optional codesign hint | 2 |
| Unsigned = warning | 2 |
| No fake signed claims | 2–3 |
