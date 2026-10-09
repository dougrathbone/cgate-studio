# Security Policy

## Supported versions

Security fixes are applied to the latest released version on the `main` branch
and published via GitHub Releases when appropriate.

## Reporting a vulnerability

Please report security issues privately via
[GitHub Security Advisories](https://github.com/dougrathbone/cgate-studio/security/advisories/new)
for this repository. Do not open a public issue for exploitable vulnerabilities.

Include:

- Affected version / commit
- Impact (e.g. IPC, local file, C-Gate command injection)
- Reproduction steps when possible

## Scope notes

CBus Studio talks only to a user-supplied **C-Gate** server over TCP. It does
not program C-Bus unit EEPROM, bundle C-Gate/JRE, or speak MQTT. Site passwords
are stored with OS-backed encryption (`safeStorage`) when available.
