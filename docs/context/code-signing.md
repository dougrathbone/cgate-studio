# Code signing & notarization

CBus Studio’s Release workflow **signs when secrets are present** and **ships unsigned otherwise**. Never commit `.p12` / `.pfx` files.

## Prerequisites

| Platform | You need |
|---|---|
| macOS | Apple Developer Program membership; a **Developer ID Application** certificate (+ private key) |
| Windows | An Authenticode code-signing certificate (`.pfx`). EV reduces SmartScreen friction but is not required for CI signing |
| Both | [`gh`](https://cli.github.com/) authenticated with `repo` + ability to set Actions secrets |

## macOS secrets (Developer ID + notarization)

1. In Apple Developer, create a **Developer ID Application** certificate.
2. Export it from Keychain as a `.p12` (include the private key). Note the export password.
3. Create an [app-specific password](https://support.apple.com/en-us/102654) for notarization.
4. Set secrets (repo `dougrathbone/cgate-studio`):

```bash
# Base64 of the .p12 (no wrapping newlines in the secret value)
base64 -i DeveloperID.p12 | gh secret set MACOS_CSC_LINK --repo dougrathbone/cgate-studio

gh secret set MACOS_CSC_KEY_PASSWORD --repo dougrathbone/cgate-studio -b 'your-p12-export-password'
gh secret set APPLE_ID --repo dougrathbone/cgate-studio -b 'you@example.com'
gh secret set APPLE_APP_SPECIFIC_PASSWORD --repo dougrathbone/cgate-studio -b 'xxxx-xxxx-xxxx-xxxx'
gh secret set APPLE_TEAM_ID --repo dougrathbone/cgate-studio -b 'ABCDE12345'
```

electron-builder receives these as `CSC_LINK` / `CSC_KEY_PASSWORD` (mapped in the Release workflow) and notarizes with notarytool when `APPLE_ID` + team id are set.

Hardened Runtime entitlements live in `resources/entitlements.mac.plist`.

## Windows secrets (Authenticode)

1. Obtain a standard or EV Authenticode certificate as a `.pfx`.
2. Set secrets:

```bash
base64 -i codesign.pfx | gh secret set WIN_CSC_LINK --repo dougrathbone/cgate-studio
gh secret set WIN_CSC_KEY_PASSWORD --repo dougrathbone/cgate-studio -b 'your-pfx-password'
```

The Windows job maps those onto `CSC_LINK` / `CSC_KEY_PASSWORD`.

## After secrets are set

1. Rebuild installers for an existing tag (or cut a new tag):

```bash
gh workflow run release.yml --repo dougrathbone/cgate-studio -f tag=v1.3.2
# or: git tag v1.4.0 && git push origin v1.4.0
```

2. Confirm the GitHub Release body includes:

   `This release signing status: macOS **signed**, Windows **signed**`

3. Verify assets + updater metadata:

```bash
npm run verify-release -- v1.3.2 --check-codesign
```

4. On a Mac, open the `.dmg`, then:

```bash
codesign -dv --verbose=4 "/Volumes/…/CBus Studio.app"
spctl --assess --type execute "/path/to/CBus Studio.app"
```

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

Verify updater YAML on a published tag with `npm run verify-release -- vX.Y.Z`.
