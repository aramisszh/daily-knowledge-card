# Weekly Incoming Pack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new Mac-side weekly workflow that receives an external incoming pack, normalizes it into the existing publish pipeline, and publishes images, audio, transcripts, cards, and manifests without using `weekly:create` as the entrypoint.

**Architecture:** Extend the weekly path helpers to support both legacy `automation/weekly/...` workspaces and new `automation/incoming/...` packs, then add a receive step that converts the external pack into the normalized plan structure already consumed by import/publish code. Add a publish step that orchestrates the existing import scripts plus a cards/manifests merge step, while updating project docs and package scripts to make the incoming-pack flow the only documented path.

**Tech Stack:** Node.js ESM scripts, Vitest, Next.js repo docs, JSON file IO

---

### Task 1: Add New Incoming-Pack Path Model

**Files:**
- Modify: `scripts/lib/weekly-paths.mjs`
- Test: `scripts/lib/weekly-paths.test.mjs`

- [ ] **Step 1: Write the failing tests for incoming and archive paths**

Add tests that assert:

```js
const incoming = getIncomingWeeklyPackPaths("/repo", "2026-W22");
expect(incoming.weekDir).toBe("/repo/automation/incoming/2026-W22");
expect(incoming.weeklyPlan).toBe("/repo/automation/incoming/2026-W22/weekly-plan.json");
expect(incoming.cardsDraft).toBe("/repo/automation/incoming/2026-W22/cards-draft.json");
expect(incoming.imageAssetsDir).toBe("/repo/automation/incoming/2026-W22/image-assets");
expect(incoming.pendingPodcastDir).toBe("/repo/automation/incoming/2026-W22/podcast_jobs/pending");
expect(incoming.donePodcastDir).toBe("/repo/automation/incoming/2026-W22/podcast_jobs/done");

const archive = getIncomingWeeklyArchivePaths("/repo", "2026-W22");
expect(archive.weekDir).toBe("/repo/automation/archive/2026-W22");
```

- [ ] **Step 2: Run the targeted test and verify it fails**

Run: `npm test -- scripts/lib/weekly-paths.test.mjs`

Expected: FAIL because `getIncomingWeeklyPackPaths` and `getIncomingWeeklyArchivePaths` do not exist yet.

- [ ] **Step 3: Implement the new path helpers with strict week-key validation**

Update `scripts/lib/weekly-paths.mjs` to:

- keep legacy `assertSafeWeekId()` and `getWeeklyWorkspacePaths()` unchanged for old tests
- add `assertSafeIncomingWeekKey()` for `YYYY-Www`
- add `getIncomingWeeklyPackPaths(projectRoot, weekKey)`
- add `getIncomingWeeklyArchivePaths(projectRoot, weekKey)`

- [ ] **Step 4: Re-run the targeted test and verify it passes**

Run: `npm test -- scripts/lib/weekly-paths.test.mjs`

Expected: PASS

### Task 2: Add Receive Step That Normalizes External Weekly Packs

**Files:**
- Create: `scripts/receive-weekly-pack.mjs`
- Create: `scripts/receive-weekly-pack.test.mjs`

- [ ] **Step 1: Write failing receive tests for minimum valid incoming packs**

Add tests that:

- create `automation/incoming/2026-W22/weekly-plan.json`
- create `automation/incoming/2026-W22/cards-draft.json`
- create matching `image-assets/*.png`
- create `podcast_jobs/done/<cardId>/transcript.md`
- create `podcast_jobs/done/<cardId>/podcast.meta.json`
- assert `runReceiveWeeklyPack({ projectRoot, weekKey: "2026-W22" })` writes a normalized plan object back to `weekly-plan.json` with:
  - `workflowMode: "incoming-pack"`
  - `cards[].image.sourceFileName`
  - `cards[].image.status: "pending"`
  - `cards[].podcast.status: "ready"`

- [ ] **Step 2: Run the targeted test and verify it fails**

Run: `npm test -- scripts/receive-weekly-pack.test.mjs`

Expected: FAIL because the script does not exist.

- [ ] **Step 3: Implement receive-weekly-pack with strict structure checks**

Implement `scripts/receive-weekly-pack.mjs` so it:

- requires `weekKey`
- reads `cards-draft.json` as the source card array
- checks every card has `id` or `cardId`, `cardDate`, `title`, `category`, `summary`, `content`
- checks `image-assets/<cardId>.png` exists
- checks `podcast_jobs/done/<cardId>/podcast.meta.json` and `transcript.md` exist
- writes a normalized `weekly-plan.json` containing the fields expected by existing import/publish code
- keeps UTF-8 writes explicit

- [ ] **Step 4: Re-run the targeted test and verify it passes**

Run: `npm test -- scripts/receive-weekly-pack.test.mjs`

Expected: PASS

### Task 3: Make Import Scripts Accept Incoming-Pack Mode

**Files:**
- Modify: `scripts/import-weekly-images.mjs`
- Modify: `scripts/import-weekly-images.test.mjs`
- Modify: `scripts/import-podcast-audio.mjs`
- Modify: `scripts/import-podcast-audio.test.mjs`

- [ ] **Step 1: Write failing tests for incoming-pack workspace resolution**

Extend the existing tests to use `automation/incoming/2026-W22/...` fixtures and assert:

- images are read from `image-assets/`
- done podcast packages are read from `podcast_jobs/done/`
- `weekly-plan.json` is updated in place

- [ ] **Step 2: Run targeted tests and verify they fail**

Run: `npm test -- scripts/import-weekly-images.test.mjs scripts/import-podcast-audio.test.mjs`

Expected: FAIL because the import scripts only resolve legacy weekly paths.

- [ ] **Step 3: Implement dual-resolution support without changing legacy behavior**

Update the import scripts so they:

- accept either `weekId` or `weekKey`
- prefer incoming-pack paths when `weekKey` is provided
- preserve the existing legacy path resolution when `weekId` is provided
- for image import, read source bytes from `image-assets/<cardId>.png`
- for audio import, keep existing file integrity and manifest behavior but resolve under incoming-pack `done/`

- [ ] **Step 4: Re-run targeted tests and verify they pass**

Run: `npm test -- scripts/import-weekly-images.test.mjs scripts/import-podcast-audio.test.mjs`

Expected: PASS

### Task 4: Add Publish Step for Cards and Manifests Merge

**Files:**
- Create: `scripts/publish-weekly-pack.mjs`
- Create: `scripts/publish-weekly-pack.test.mjs`
- Reuse/align: `scripts/weekly-continue.mjs`

- [ ] **Step 1: Write failing publish tests**

Add tests that:

- build an incoming pack fixture
- run `runReceiveWeeklyPack(...)`
- run `runPublishWeeklyPack(...)`
- assert:
  - `data/cards.json` contains the new cards merged by `id`
  - existing user-local study fields on unrelated cards remain untouched
  - `data/podcast-manifest.json` contains canonical published entries
  - new cards preserve readable Chinese text after write-and-read

- [ ] **Step 2: Run the targeted test and verify it fails**

Run: `npm test -- scripts/publish-weekly-pack.test.mjs`

Expected: FAIL because the script does not exist.

- [ ] **Step 3: Implement publish-weekly-pack by orchestrating existing steps**

Implement `scripts/publish-weekly-pack.mjs` so it:

- requires `weekKey`
- reads the normalized incoming `weekly-plan.json`
- calls the image import step
- calls the audio import step
- merges normalized cards into `data/cards.json`
- updates `data/podcast-manifest.json`
- reuses the formal-card validation discipline from `weekly-continue.mjs`
- re-reads written cards and throws if Chinese text contains `??` or `�`

- [ ] **Step 4: Re-run the targeted test and verify it passes**

Run: `npm test -- scripts/publish-weekly-pack.test.mjs`

Expected: PASS

### Task 5: Update Project Commands and Docs

**Files:**
- Modify: `package.json`
- Modify: `AGENTS.md`
- Modify: `docs/MAC_CODEX_WEEKLY_WORKFLOW.md`

- [ ] **Step 1: Write the documentation and script mapping changes**

Update:

- `package.json` to add `weekly:receive` and `weekly:publish`
- `AGENTS.md` weekly workflow section to define incoming-pack mode as the standard path
- `docs/MAC_CODEX_WEEKLY_WORKFLOW.md` to remove Mac-side content generation responsibilities and document the new incoming/archive structure

- [ ] **Step 2: Run verification for the modified workflow**

Run: `npm test -- scripts/lib/weekly-paths.test.mjs scripts/receive-weekly-pack.test.mjs scripts/import-weekly-images.test.mjs scripts/import-podcast-audio.test.mjs scripts/publish-weekly-pack.test.mjs`

Expected: PASS

- [ ] **Step 3: Run full project verification**

Run:

- `npm test`
- `npm run build`
- `npm run site:capacity`

Expected:

- tests pass
- build passes, or if sandbox blocks build execution, capture the exact blocker
- capacity check completes successfully
