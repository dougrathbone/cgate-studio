# M1 Smoke Checklist (run against a real CNI)

- [ ] App launches via `npm run dev`.
- [ ] Connect to C-Gate host:20023 / event:20025 → status becomes `connected`.
- [ ] Network tree renders networks → apps → groups with labels.
- [ ] Physically toggling a light updates its badge to ON/OFF within ~1s.
- [ ] Ramping a dimmer updates the percentage shown.
- [ ] Disconnecting C-Gate shows `reconnecting`; restoring it recovers.
