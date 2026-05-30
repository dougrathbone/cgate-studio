# CBus Studio

A cross-platform (macOS-first) desktop app to **browse, organize, and test** a Clipsal C-Bus network — without needing a Windows machine running C-Bus Toolkit.

CBus Studio is an Electron app that connects to an existing **C-Gate** server over TCP (the same documented interface C-Bus Toolkit uses under the hood) and provides a GUI for:

- **Browsing** your network: discover and visualize networks, applications, groups and units with live on/off + level state.
- **Commissioning / testing**: switch and ramp groups to verify wiring during an install.
- **Organizing**: view and rename the tag database (network/group labels) and save the project.

It is **open-source** and deliberately does **not** attempt Toolkit's proprietary unit-programming features.

## Status

Foundation + **M1 (Connect & Browse)** is implemented: the app connects to C-Gate,
renders the network tree (networks → applications → groups) from `TREEXML`, and shows
live on/off + level state from the event stream. Verified against an in-process mock
C-Gate (Jest). M2 (Commission/Test) and M3 (Organize) are still to come.

- Design spec: [`docs/specs/2026-05-30-cbus-studio-design.md`](docs/specs/2026-05-30-cbus-studio-design.md)
- Implementation plan: [`docs/plans/2026-05-30-foundation-and-m1-browse.md`](docs/plans/2026-05-30-foundation-and-m1-browse.md)
- Start-here context: [`docs/context/session-starter.md`](docs/context/session-starter.md)
- M1 smoke checklist: [`docs/smoke-checklist-m1.md`](docs/smoke-checklist-m1.md)

## Requirements (runtime)

- A running **C-Gate** server reachable over TCP (default command port 20023, event/status port 20025).
- A **CNI (Ethernet)** C-Bus interface. (USB/serial PCI is out of scope.)

## Development

- Install: `npm install`
- Run app: `npm run dev`
- Test: `npm test`

Requires a reachable C-Gate (command port 20023, event/status port 20025).

## Relationship to cgateweb

CBus Studio reuses the tested C-Gate protocol client from the sibling
[`cgateweb`](https://github.com/dougrathbone/cgateweb) project (connection pool,
event/command parsers, TREEXML handling). See
[`docs/context/vendoring-cgate-client.md`](docs/context/vendoring-cgate-client.md).

## License

TBD (intended open source).
