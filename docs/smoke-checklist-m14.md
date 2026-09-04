# Smoke checklist — M14 Commission depth

Against a live C-Gate (or mock) with a loaded project/network.

## Inventory

- [ ] Commission → Inventory shows Type as `Category (CODE)` (M13 labels)
- [ ] Serial / Firmware columns show tree values or `—`
- [ ] **Export inventory** saves a CSV with header `network,address,type,typeLabel,serial,firmware,name`

## Mismatch cues

- [ ] Group Settings: when TagName ≠ object Name (both non-empty), hint appears
- [ ] Hint hidden when either side empty

## Safety

- [ ] Inventory export does **not** mark the project dirty
- [ ] **Refresh params** updates Serial/Firmware from GET and does **not** mark dirty
- [ ] No Add group / programming UI introduced
- [ ] ArrowUp/Down from Inventory/Groups filter moves the inspector selection
