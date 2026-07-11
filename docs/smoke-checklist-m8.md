# Smoke checklist — M8 Commission UI

Against a live C-Gate (or mock):

- [ ] Connect to a site; header shows **Operate | Commission** toggle
- [ ] **Operate** still shows the device tree and group controls
- [ ] **Commission → Groups**: flat table of groups; filter works
- [ ] Multi-select two lighting groups → **On** / **Off** / **50%** changes levels (events update)
- [ ] Row click opens EntityPanel (group Live/Settings/All)
- [ ] **Commission → Inventory**: units table; click opens unit inspector tabs
- [ ] **Refresh** runs sync/reload and shows busy state (not unit programming)
- [ ] No programming / EEPROM UI appears
