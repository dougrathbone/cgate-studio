# CBus Studio — M11 Distribution (signing, notarization, auto-update)

**Date:** 2026-09-01  
**Status:** Approved (implementation)  
**Does not change:** Approach A product scope (M1–M10). Unit programming, bundled C-Gate, MQTT/HA, and serial PCI remain out of scope.

## Goal

Make 1.3.0+ installers something people can actually launch and keep current:

1. **Sign** macOS and Windows installers when certificates are present in CI.
2. **Notarize** macOS builds so Gatekeeper does not require right-click Open.
3. **Auto-update** packaged apps from GitHub Releases (`electron-updater`).
4. **Linux AppImage** as the cross-platform bonus (unsigned is fine).
5. Keep an **unsigned fallback** so a missing cert never blocks a release.

## Non-goals

- Purchasing or storing certificates in git (repo secrets only)
- Claiming a build is signed when `CSC_LINK` was empty
- Structural TagName-DB “add group” (still blocked on C-Gate 3.3.2)
- Managed / bundled C-Gate

## Secrets (GitHub Actions)

| Secret | Used by |
|---|---|
| `MACOS_CSC_LINK` | Base64-encoded Mac Developer ID Application `.p12` |
| `MACOS_CSC_KEY_PASSWORD` | Password for that `.p12` |
| `APPLE_ID` | Apple ID for notarytool |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password |
| `APPLE_TEAM_ID` | 10-character Team ID |
| `WIN_CSC_LINK` | Base64-encoded Windows Authenticode `.pfx` |
| `WIN_CSC_KEY_PASSWORD` | Password for that `.pfx` |

If a platform’s `*_CSC_LINK` is unset, that job builds **unsigned** (`CSC_IDENTITY_AUTO_DISCOVERY=false`) and the release notes say so.

## Auto-update

- Provider: GitHub Releases for `dougrathbone/cgate-studio`.
- Check only in **packaged** builds (`app.isPackaged`).
- Download in the background; show a banner when ready; **Restart** installs.
- Help → **Check for Updates…** (and macOS app menu).
- Release assets must include `latest.yml` / `latest-mac.yml` / `latest-linux.yml` and `.blockmap` files.

## Success criteria

1. With secrets set, macOS `.dmg`/`.zip` are signed + notarized; Windows `.exe` is Authenticode-signed.
2. Without secrets, CI still publishes unsigned installers (current 1.3.0 behaviour).
3. A packaged build of N can download N+1 from GitHub Releases and restart into it.
4. Linux AppImage is attached to the same GitHub Release.
