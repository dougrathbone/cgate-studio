# Code signing & notarization

CBus Studio’s Release workflow **signs when secrets are present** and **ships unsigned otherwise**. Never commit `.p12` / `.pfx` files.

## macOS (Developer ID Application)

1. In Apple Developer, create a **Developer ID Application** certificate.
2. Export it from Keychain as a `.p12` (include the private key).
3. Base64-encode the file (`base64 -i cert.p12 | pbcopy` on macOS).
4. Add GitHub Actions secrets:

   - `MACOS_CSC_LINK` — that base64 blob  
   - `MACOS_CSC_KEY_PASSWORD` — export password  
   - `APPLE_ID` — Apple ID email  
   - `APPLE_APP_SPECIFIC_PASSWORD` — [app-specific password](https://support.apple.com/en-us/102654)  
   - `APPLE_TEAM_ID` — 10-character team id  

electron-builder uses `CSC_LINK` / `CSC_KEY_PASSWORD` (the workflow maps the macOS secrets onto those names) and notarizes with notarytool when `APPLE_ID` + team id are set.

Hardened Runtime entitlements live in `resources/entitlements.mac.plist`.

## Windows (Authenticode)

1. Obtain a standard or EV Authenticode certificate as a `.pfx`.
2. Base64-encode it.
3. Secrets:

   - `WIN_CSC_LINK`  
   - `WIN_CSC_KEY_PASSWORD`  

The Windows job maps those onto `CSC_LINK` / `CSC_KEY_PASSWORD`.

## Verifying a local unsigned build

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:mac   # macOS host
# or
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:win
```

CI does the same when the corresponding `*_CSC_LINK` secret is empty.

Each GitHub Release body includes a **This release signing status** line (`signed` /
`unsigned` / `unknown` per platform) so readers know whether that tag’s artifacts
were signed, not only the general policy.

## Auto-update

Packaged apps check [GitHub Releases](https://github.com/dougrathbone/cgate-studio/releases) via `electron-updater`. Each release must attach:

- `latest-mac.yml` + mac `.zip` (and `.blockmap`)
- `latest.yml` + Windows NSIS `.exe` (and `.blockmap`)
- `latest-linux.yml` + `.AppImage`

Unpackaged `npm run dev` does not check GitHub; **Check for Updates…** explains that.
