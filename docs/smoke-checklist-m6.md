# M6 smoke checklist — Session & project

Manual verification against a live C-Gate (CNI). Check each box when confirmed.

## Connect / disconnect

- [ ] Add a site (name, host, ports) and Connect
- [ ] Edit site (host/ports/default project/network) and Save
- [ ] Optional C-Gate LOGIN fields work when the server requires auth
- [ ] Disconnect returns to idle without auto-reconnect
- [ ] Reconnect restores the session

## Project picker

- [ ] Header shows Project select populated from `PROJECT DIR` / `LIST`
- [ ] Choosing another project runs load → start → use and refreshes networks
- [ ] Site `defaultProject` is selected automatically on connect when present

## Network picker

- [ ] Header shows Network select from `NET LIST` (not hardcoded 254)
- [ ] Changing network reloads the device tree for that address
- [ ] Site `defaultNetwork` is selected when present in `NET LIST`
- [ ] Tree reconcile (742) re-fetches the **active** network

## TREEXML path

- [ ] On C-Gate 3.x, tree load uses `TREEXML //project/<net>` (check C-Gate logs)
- [ ] On older C-Gate, bare `TREEXML <net>` still works (fallback)

## Regression

- [ ] Live levels, on/off/ramp, rename + save still work after session pickers
- [ ] Import/export labels still work
