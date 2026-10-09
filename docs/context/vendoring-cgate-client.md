# C-Gate client (Phase B)

CBus Studio consumes the protocol surface of [`cgateweb`](https://github.com/dougrathbone/cgateweb)
as a **tagged git dependency**. Import **only** the library barrels — never the package root:

```js
require('cgateweb/cgate-client')           // transport, parsers, protocol constants
require('cgateweb/cgate-client/project')   // Toolkit project parser (sql.js / zip)
```

The bare `cgateweb` entry is the MQTT/HA **bridge application**. It loads
`settings.js` from the cwd, writes to stdout, and can call `process.exit`.
The barrels are import-pure.

## Pinning and install

- Pin to a **cgateweb release tag** in `package.json` (currently
  `github:dougrathbone/cgateweb#v1.32.0`).
- Always install with **`npm ci`** so `package-lock.json` resolves the exact
  git commit. Do not track `master`.
- To bump: change the tag in `package.json`, run `npm install`, commit the
  lockfile commit hash change, and run `npm run test:ci`.

This repo stays a **standalone** product (not an npm workspaces monorepo and not
a git submodule of cgateweb). Upstream protocol fixes land in cgateweb; Studio
bumps the tag.

## What Studio still keeps locally (`src/cgate-client/`)

These modules have no equivalent in the cgateweb barrels (or need Studio-only
behaviour):

| File | Why local |
|---|---|
| `treexml.js` | C-Gate `TREEXML` line-stripping + tree parse for the desktop UI |
| `cbusProjectExporter.js` | Toolkit-compatible XML/CBZ **export** (CSV is in `projectExport.ts`) |
| `cbusProjectParser.js` | Fork that also returns `networkLabels` / `applicationLabels`. Upstream `cgateweb/cgate-client/project` is group-labels only and lazy-loads sql.js WASM, which asar packaging does not yet locate |

**Upstream candidates** (contribute to cgateweb, then delete the local fork):
enriched project parser labels, TREEXML helper, CBZ exporter.

Do not vendor `cgateConnection.js`, `cbusEvent.js`, `constants.js`, `logger.js`,
or `backoff.js` again — they come from the barrel.

## Adding something missing from the barrel

If Studio needs a protocol symbol that is not exported, add it **upstream** in
cgateweb and bump the git tag here. Do not copy files back into this repo.
