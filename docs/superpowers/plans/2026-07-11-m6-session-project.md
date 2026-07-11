# M6 — Session & Project Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users disconnect, edit sites (including optional LOGIN), pick/load/start/use a C-Gate project, and browse any network from `NET LIST` — removing the hardcoded network `254`.

**Architecture:** Extend `CgateService` with project/network session commands; surface them via IPC; update renderer with disconnect, site edit, project picker, and network picker. Keep mock C-Gate in lockstep for CI.

**Tech Stack:** Electron, React, TypeScript, Jest, existing `CgateService` + mock TCP server

**Spec:** `docs/superpowers/specs/2026-07-11-cgate-frontend-parity-design.md`

**Later milestones (not in this plan):** M7 network health/sync, M8 Commission shell, M9 tag DB authoring, M10 diagnostics.

---

## File map

| File | Responsibility |
|---|---|
| `src/shared/types.ts` | Site credentials fields; project/network session types |
| `src/main/CgateService.ts` | PROJECT/NET commands; project-qualified TREEXML |
| `src/main/ipc.ts` + `src/preload/index.ts` + `src/renderer/api.ts` | New IPC channels |
| `tests/helpers/mockCgate.ts` | Mock PROJECT/NET responses |
| `src/renderer/components/SiteForm.tsx` / `SiteList.tsx` | Edit site + LOGIN fields + Disconnect |
| `src/renderer/components/SessionBar.tsx` (new) | Project + network pickers |
| `src/renderer/App.tsx` | Wire session flow; stop hardcoding `254` |
| Tests under `tests/main/`, `tests/renderer/` | Coverage for new paths |

---

### Task 1: Shared types for session

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Extend Site and add session types**

Add optional credentials to `Site` / `SiteInput`, and export:

```typescript
export interface CgateProjectInfo {
  name: string;
  state?: string | null; // e.g. "stopped" | "started" from PROJECT LIST
}

export interface CgateNetworkInfo {
  address: string;           // e.g. "254"
  state?: string | null;     // State=
  interfaceState?: string | null;
  syncState?: string | null;
}

export interface SessionInfo {
  projectName: string | null;
  networks: CgateNetworkInfo[];
  activeNetwork: string | null;
}
```

Add to `Site`:

```typescript
username?: string;
password?: string;
defaultProject?: string;
defaultNetwork?: string;
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat(session): add project/network session types and site credentials"
```

---

### Task 2: Mock C-Gate PROJECT / NET commands

**Files:**
- Modify: `tests/helpers/mockCgate.ts`
- Test: `tests/helpers/mockCgate.test.ts` (extend)

- [ ] **Step 1: Write failing tests for new mock commands**

In `tests/helpers/mockCgate.test.ts`, assert the mock responds to:

- `PROJECT DIR` → `123-project=…` lines ending with a terminal `123 project=…`
- `PROJECT LIST` → `123 project=NAME state=started` (or `124 no projects found`)
- `PROJECT LOAD NAME` / `START` / `USE` → `200 OK.`
- `NET LIST` → `131 network=254 State=ok InterfaceState=running`
- `TREEXML //PROJ/254` → same tree fixture as bare `TREEXML 254`

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npx jest tests/helpers/mockCgate.test.ts -v`

- [ ] **Step 3: Implement mock handlers**

Extend the mock command router to handle the above. Keep existing TREEXML bare-net behaviour. When `PROJECT USE X` is received, remember active project for path-qualified TREEXML.

- [ ] **Step 4: Run tests — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add tests/helpers/mockCgate.ts tests/helpers/mockCgate.test.ts
git commit -m "test(mock): support PROJECT and NET session commands"
```

---

### Task 3: CgateService project & network APIs

**Files:**
- Modify: `src/main/CgateService.ts`
- Test: `tests/cgateService.test.ts` and/or new `tests/main/CgateService.session.test.ts`

- [ ] **Step 1: Write failing tests**

Cover:

1. `listProjectsOnDisk()` parses `PROJECT DIR`
2. `listLoadedProjects()` parses `PROJECT LIST`
3. `loadProject(name)` / `startProject(name)` / `useProject(name)` send commands and update cached `projectName` on USE
4. `listNetworks()` parses `NET LIST`
5. `getTree(network)` tries `TREEXML //project/net` first; on failure falls back to `TREEXML net`

- [ ] **Step 2: Run — expect FAIL**

Run: `npx jest tests/main/CgateService.session.test.ts -v`

- [ ] **Step 3: Implement on CgateService**

```typescript
async listProjectsOnDisk(): Promise<CgateProjectInfo[]>
async listLoadedProjects(): Promise<CgateProjectInfo[]>
async loadProject(name: string): Promise<CommandResult>
async startProject(name: string): Promise<CommandResult>
async useProject(name: string): Promise<CommandResult> // sets this.projectName
async listNetworks(): Promise<CgateNetworkInfo[]>
```

Update `getTree(network: string)`:

```typescript
async getTree(network: string): Promise<Tree> {
  const project = await this.ensureProjectName();
  try {
    return await this.fetchTreexml(`//${project}/${network}`);
  } catch {
    return await this.fetchTreexml(network);
  }
}
```

Refactor existing TREEXML send into private `fetchTreexml(target: string)`.

Parse helpers can live in `src/main/cgateSessionParse.ts` (new) with unit tests.

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add src/main/CgateService.ts src/main/cgateSessionParse.ts tests/main/
git commit -m "feat(cgate): project load/use and multi-network TREEXML"
```

---

### Task 4: IPC + preload + renderer API

**Files:**
- Modify: `src/main/ipc.ts`, `src/preload/index.ts`, `src/renderer/api.ts`, `src/renderer/env.d.ts`
- Test: `tests/main/ipc.test.ts`, `tests/preload/preload.test.ts`, `tests/renderer/api.test.tsx`

- [ ] **Step 1: Add channels**

```typescript
projectDir: 'project:dir',
projectList: 'project:list',
projectLoad: 'project:load',
projectStart: 'project:start',
projectUse: 'project:use',
netList: 'net:list',
```

Wire handlers to the new `CgateService` methods. `disconnect` already exists — ensure preload/api expose it if missing.

- [ ] **Step 2: Tests for channel registration + api wrappers**

- [ ] **Step 3: Commit**

```bash
git add src/main/ipc.ts src/preload/index.ts src/renderer/api.ts src/renderer/env.d.ts tests/
git commit -m "feat(ipc): expose project and network session channels"
```

---

### Task 5: Site edit + credentials + Disconnect UI

**Files:**
- Modify: `src/renderer/components/SiteForm.tsx`, `SiteList.tsx`, `App.tsx`
- Modify: `src/main/SiteStore.ts` if persistence needs to accept new fields (should already store full Site objects)
- Test: `tests/renderer/SiteForm.test.tsx`, `SiteList.test.tsx`, `App.test.tsx`

- [ ] **Step 1: Failing UI tests**

- SiteForm can edit an existing site (pre-filled) and save via `sites:update`
- Optional username/password fields
- SiteList shows Disconnect when connected; calling it invokes `cgate.disconnect()`

- [ ] **Step 2: Implement**

- Add `editingSite: Site | null` flow in App or SiteList
- Pass credentials from Site into `ConnectOptions` on connect
- Wire Disconnect button

- [ ] **Step 3: Tests pass + commit**

```bash
git commit -m "feat(ui): site edit, LOGIN fields, and disconnect"
```

---

### Task 6: SessionBar — project & network pickers

**Files:**
- Create: `src/renderer/components/SessionBar.tsx`
- Modify: `src/renderer/App.tsx`
- Test: `tests/renderer/SessionBar.test.tsx`, update `App.test.tsx` / `App.treeChanged.test.tsx`

- [ ] **Step 1: Failing tests for SessionBar**

- Renders project select from `project:dir` / loaded list
- Choosing a project calls load → start → use (or use if already loaded)
- Renders network select from `net:list`
- Changing network reloads tree for that address
- App no longer hardcodes `'254'` — uses `activeNetwork` state (default from site or first NET LIST entry)

- [ ] **Step 2: Implement SessionBar + App wiring**

Connect flow becomes:

1. `connect(opts)`
2. If `site.defaultProject` → load/start/use; else show picker / use first from DIR
3. `listNetworks()` → set `activeNetwork` from `defaultNetwork` or first entry
4. `getTree(activeNetwork)`

Show SessionBar in header when `status === 'connected'`.

- [ ] **Step 3: Fix any tests that assumed network `254` only**

- [ ] **Step 4: Full suite**

Run: `npm test`

Expected: PASS (coverage ≥ 80%)

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(ui): project and network session pickers (M6)"
```

---

### Task 7: Docs + smoke checklist

**Files:**
- Create: `docs/smoke-checklist-m6.md`
- Modify: `README.md` (Features — Session & project)
- Modify: `docs/context/session-starter.md` (add M6 to milestones)

- [ ] **Step 1: Write smoke checklist** (connect, disconnect, edit site, LOGIN if needed, project pick, network pick, tree loads)

- [ ] **Step 2: Update README feature section briefly**

- [ ] **Step 3: Commit**

```bash
git commit -m "docs: M6 session/project smoke checklist and README"
```

---

## Self-review

- Spec coverage: M6 items from design all mapped to Tasks 1–7
- M7–M10 deferred to follow-on plans
- No unit-programming scope creep
- Types consistent: `CgateProjectInfo`, `CgateNetworkInfo`, `SessionInfo`
