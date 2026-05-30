# CBus Studio

A cross-platform (macOS-first) desktop app to **browse, organize, and test** a Clipsal C-Bus network — without needing a Windows machine running C-Bus Toolkit.

CBus Studio is an Electron app that connects to an existing **C-Gate** server over TCP (the same documented interface C-Bus Toolkit uses under the hood) and provides a GUI for:

- **Browsing** your network: discover and visualize networks, applications, groups and units with live on/off + level state.
- **Commissioning / testing**: switch and ramp groups to verify wiring during an install.
- **Organizing**: view and rename the tag database (network/group labels) and save the project.

It is **open-source** and deliberately does **not** attempt Toolkit's proprietary unit-programming features.

## Status

Pre-implementation. The design is complete and approved:

- Design spec: [`docs/specs/2026-05-30-cbus-studio-design.md`](docs/specs/2026-05-30-cbus-studio-design.md)
- Implementation plan: `docs/plans/` (to be written)
- Start-here context: [`docs/context/session-starter.md`](docs/context/session-starter.md)

## Requirements (runtime)

- A running **C-Gate** server reachable over TCP (default command port 20023, event/status port 20025).
- A **CNI (Ethernet)** C-Bus interface. (USB/serial PCI is out of scope.)

## Relationship to cgateweb

CBus Studio reuses the tested C-Gate protocol client from the sibling
[`cgateweb`](https://github.com/dougrathbone/cgateweb) project (connection pool,
event/command parsers, TREEXML handling). See
[`docs/context/vendoring-cgate-client.md`](docs/context/vendoring-cgate-client.md).

## License

TBD (intended open source).
