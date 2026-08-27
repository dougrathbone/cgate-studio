# C-Gate client (Phase B)

CBus Studio consumes the protocol surface of [`cgateweb`](https://github.com/dougrathbone/cgateweb)
as a git dependency. Import **only** the library barrels — never the package root:

```js
require('cgateweb/cgate-client')           // transport, parsers, protocol constants
require('cgateweb/cgate-client/project')   // Toolkit project parser (sql.js / zip)
```

The bare `cgateweb` entry is the MQTT/HA **bridge application**. It loads
`settings.js` from the cwd, writes to stdout, and can call `process.exit`.
The barrels are import-pure.

Pin the dependency to a **cgateweb release tag** in `package.json`
(currently `github:dougrathbone/cgateweb#v1.32.0`). Bump the tag when you
want protocol fixes; do not track `master`.

## What Studio still keeps locally (`src/cgate-client/`)

These modules have no equivalent in the cgateweb barrels (or need Studio-only
behaviour):

| File | Why local |
|---|---|
| `treexml.js` | C-Gate `TREEXML` line-stripping + tree parse for the desktop UI |
| `cbusProjectExporter.js` | Toolkit-compatible XML/CBZ **export** (CSV is in `projectExport.ts`) |
| `cbusProjectParser.js` | Fork that also returns `networkLabels` / `applicationLabels`. Upstream `cgateweb/cgate-client/project` is group-labels only and lazy-loads sql.js WASM, which asar packaging does not yet locate |

Do not vendor `cgateConnection.js`, `cbusEvent.js`, `constants.js`, `logger.js`,
or `backoff.js` again — they come from the barrel.

## Adding something missing from the barrel

If Studio needs a protocol symbol that is not exported, add it **upstream** in
cgateweb and bump the git tag here. Do not copy files back into this repo.
