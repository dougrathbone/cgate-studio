# M7 smoke checklist — Network health

Manual verification against a live C-Gate.

## Status bar

- [ ] Connected session shows Conn / Project / Net / State / Iface / Sync
- [ ] Refresh updates health from C-Gate GET
- [ ] FORCE badge appears when State=new (or mid-sync)

## Network ops

- [ ] Open runs `NET OPEN` (progress / Working… while busy)
- [ ] Close runs `NET CLOSE`
- [ ] Sync runs `DO <net> SYNC` and refreshes the tree afterward
- [ ] Ops fail safely with an error pill if C-Gate rejects

## FORCE

- [ ] With State=ok, ON/OFF/RAMP do **not** append FORCE (check Activity)
- [ ] With State=new, ON/OFF/RAMP append FORCE

## Activity drawer

- [ ] Activity toggle opens the drawer
- [ ] TX/RX lines appear for commands
- [ ] Drawer closes cleanly

## Regression

- [ ] Project/network pickers (M6) still work
- [ ] Live levels and rename/save still work
