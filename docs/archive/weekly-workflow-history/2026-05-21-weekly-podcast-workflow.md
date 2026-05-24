# AI Podcast Weekly Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Mac-side weekly workflow that creates a 7-card weekly plan, imports user-generated images, imports Windows-generated podcast audio, safely writes `data/cards.json`, updates manifests, and validates deploy readiness.

**Architecture:** Keep `data/cards.json` as the content source of truth. Scripts operate on an intermediate `automation/weekly/{weekId}/weekly-plan.json` until all required assets are imported; only `weekly:continue` can write formal card data. Asset scripts never overwrite existing published files and never delete historical files.

**Tech Stack:** Node.js ESM scripts, Vitest, Next.js static public assets, local JSON files, existing `scripts/lib/podcast-file-utils.mjs`.

---

## Scope Boundaries

This plan implements Mac-side scripts only:

- `scripts/weekly-create.mjs`
- `scripts/import-weekly-images.mjs`
- `scripts/import-podcast-audio.mjs`
- `scripts/weekly-continue.mjs`
- `scripts/archive-assets.mjs`
- package commands for the scripts above
- tests for path logic, idempotency, no-overwrite behavior, manifest updates, and `cards.json` write safety

This plan does not implement:

- Windows ComfyUI execution
- online OpenAI generation endpoints
- Supabase content migration
- object storage migration
- RSS feeds
- admin UI
- multi-user podcast progress
- Git push or deployment automation

## Ownership Split

Main model must own or strictly review:

- `data/cards.json` write logic
- version increment logic
- duplicate prevention
- archive / withdraw / rollback behavior
- package script wiring
- deployment readiness checks
- any script that copies files into `public/`

`gpt-5.4` can own, with review:

- pure helper tests
- Markdown template wording
- non-mutating validators
- path joining helpers
- log formatting helpers
- fixture setup in tests

## Files

Create:

- `scripts/lib/weekly-paths.mjs`
- `scripts/lib/weekly-paths.test.mjs`
- `scripts/lib/weekly-json.mjs`
- `scripts/lib/weekly-json.test.mjs`
- `scripts/lib/weekly-plan.mjs`
- `scripts/lib/weekly-plan.test.mjs`
- `scripts/weekly-create.mjs`
- `scripts/weekly-create.test.mjs`
- `scripts/import-weekly-images.mjs`
- `scripts/import-weekly-images.test.mjs`
- `scripts/import-podcast-audio.mjs`
- `scripts/import-podcast-audio.test.mjs`
- `scripts/weekly-continue.mjs`
- `scripts/weekly-continue.test.mjs`
- `scripts/archive-assets.mjs`
- `scripts/archive-assets.test.mjs`
- `automation/weekly/.gitkeep` already exists; keep it

Modify:

- `package.json`
- `scripts/validate-weekly-assets.mjs`
- `docs/AI_PODCAST_HANDOFF.md`
- `docs/WINDOWS_CODEX_TTS_WORKFLOW.md`

Do not modify unless explicitly approved during implementation:

- `database/schema.sql`
- `src/app/page.tsx`
- `src/services/card-service.ts`
- `src/types/knowledge.ts`

---

## Data Contracts

### `weekly-plan.json`

Every script must preserve this shape:

```json
{
  "weekId": "2026-05-28_to_2026-06-03",
  "createdAt": "2026-05-21T15:30:00+08:00",
  "updatedAt": "2026-05-21T15:30:00+08:00",
  "status": "created",
  "cards": [
    {
      "cardId": "2026-05-28-topic-slug",
      "cardDate": "2026-05-28",
      "category": "商业金融",
      "subCategory": "商业模式",
      "difficulty": "入门",
      "title": "标题",
      "subtitle": "副标题",
      "summary": "摘要",
      "keywords": ["关键词"],
      "content": {
        "title": "标题",
        "subtitle": "副标题",
        "category": "商业金融",
        "subCategory": "商业模式",
        "difficulty": "入门",
        "summary": "摘要",
        "coreMechanism": "核心机制",
        "whyImportant": ["要点一", "要点二", "要点三"],
        "processSteps": [
          { "step": 1, "title": "第一步", "desc": "说明" }
        ],
        "keywords": [
          { "term": "关键词", "desc": "解释" }
        ],
        "misconception": { "title": "常见误区", "content": "说明" },
        "financeAngle": "财务视角",
        "memoryHooks": ["记忆钩子"],
        "thinkingQuestions": [
          {
            "level": "概念理解",
            "question": "问题",
            "answer": "答案",
            "keyPoint": "考察点"
          }
        ],
        "conclusion": "结论"
      },
      "image": {
        "status": "pending",
        "rawPath": "automation/weekly/2026-05-28_to_2026-06-03/images/raw/2026-05-28-topic-slug.png",
        "publishedUrl": null,
        "sizeBytes": null,
        "checksum": null
      },
      "podcast": {
        "status": "pending",
        "version": 1,
        "title": "标题",
        "targetDurationSec": 180,
        "pendingDir": "automation/weekly/2026-05-28_to_2026-06-03/podcast_jobs/pending/2026-05-28-topic-slug",
        "doneDir": "automation/weekly/2026-05-28_to_2026-06-03/podcast_jobs/done/2026-05-28-topic-slug",
        "audioUrl": null,
        "transcriptUrl": null,
        "duration": null,
        "sizeBytes": null,
        "checksum": null
      }
    }
  ]
}
```

### Idempotency Rules

- `weekly:create` can rerun for an existing `weekId` only if the existing plan cards match the same dates. It may refresh `image2-prompts.md`, `handoff-to-windows.md`, and `mac-run-log.md`, but must not duplicate cards.
- `weekly:import-images` can rerun and report already imported images as OK when checksum and path match.
- `weekly:import-audio` can rerun and report already imported audio as OK when checksum and path match.
- `weekly:continue` must skip cards already present in `data/cards.json` by `id`; it must not append duplicates.
- No script may overwrite an existing destination file with different bytes.

---

## Task 1: Shared Weekly Helpers

**Files:**

- Create: `scripts/lib/weekly-paths.mjs`
- Create: `scripts/lib/weekly-paths.test.mjs`
- Create: `scripts/lib/weekly-json.mjs`
- Create: `scripts/lib/weekly-json.test.mjs`

- [ ] **Step 1: Write failing path tests**

Create `scripts/lib/weekly-paths.test.mjs`:

```js
import { describe, expect, it } from "vitest";
import {
  assertSafeWeekId,
  getWeeklyWorkspacePaths,
  publicUrlToFilePath,
} from "./weekly-paths.mjs";

describe("assertSafeWeekId", () => {
  it("accepts the project week id format", () => {
    expect(assertSafeWeekId("2026-05-28_to_2026-06-03")).toBe("2026-05-28_to_2026-06-03");
  });

  it("rejects traversal and shell-like input", () => {
    expect(() => assertSafeWeekId("../bad")).toThrow("Invalid weekId");
    expect(() => assertSafeWeekId("2026-05-28;rm")).toThrow("Invalid weekId");
  });
});

describe("getWeeklyWorkspacePaths", () => {
  it("returns every required weekly workspace path", () => {
    const paths = getWeeklyWorkspacePaths("/repo", "2026-05-28_to_2026-06-03");

    expect(paths.weekDir).toBe("/repo/automation/weekly/2026-05-28_to_2026-06-03");
    expect(paths.weeklyPlan).toBe("/repo/automation/weekly/2026-05-28_to_2026-06-03/weekly-plan.json");
    expect(paths.rawImagesDir).toBe("/repo/automation/weekly/2026-05-28_to_2026-06-03/images/raw");
    expect(paths.pendingPodcastDir).toBe("/repo/automation/weekly/2026-05-28_to_2026-06-03/podcast_jobs/pending");
    expect(paths.donePodcastDir).toBe("/repo/automation/weekly/2026-05-28_to_2026-06-03/podcast_jobs/done");
  });
});

describe("publicUrlToFilePath", () => {
  it("maps public URLs back to files under public", () => {
    expect(publicUrlToFilePath("/audio/published/a.mp3", "/repo")).toBe("/repo/public/audio/published/a.mp3");
  });

  it("rejects non-public relative URLs", () => {
    expect(() => publicUrlToFilePath("https://example.com/a.mp3", "/repo")).toThrow("Only root-relative public URLs are supported");
  });
});
```

- [ ] **Step 2: Run path test and confirm red**

Run:

```bash
npm test -- scripts/lib/weekly-paths.test.mjs
```

Expected: fail because `scripts/lib/weekly-paths.mjs` does not exist.

- [ ] **Step 3: Implement `weekly-paths.mjs`**

```js
import path from "node:path";

const WEEK_ID_PATTERN = /^\d{4}-\d{2}-\d{2}_to_\d{4}-\d{2}-\d{2}$/;

export function assertSafeWeekId(weekId) {
  if (!WEEK_ID_PATTERN.test(weekId)) {
    throw new Error(`Invalid weekId: ${weekId}`);
  }
  return weekId;
}

export function getWeeklyWorkspacePaths(projectRoot, weekId) {
  const safeWeekId = assertSafeWeekId(weekId);
  const weekDir = path.join(projectRoot, "automation", "weekly", safeWeekId);
  return {
    weekDir,
    weeklyPlan: path.join(weekDir, "weekly-plan.json"),
    image2Prompts: path.join(weekDir, "image2-prompts.md"),
    macRunLog: path.join(weekDir, "mac-run-log.md"),
    handoffToWindows: path.join(weekDir, "handoff-to-windows.md"),
    rawImagesDir: path.join(weekDir, "images", "raw"),
    pendingPodcastDir: path.join(weekDir, "podcast_jobs", "pending"),
    donePodcastDir: path.join(weekDir, "podcast_jobs", "done"),
    failedPodcastDir: path.join(weekDir, "podcast_jobs", "failed"),
  };
}

export function publicUrlToFilePath(publicUrl, projectRoot) {
  if (!publicUrl.startsWith("/") || publicUrl.startsWith("//")) {
    throw new Error("Only root-relative public URLs are supported");
  }
  return path.join(projectRoot, "public", publicUrl.slice(1));
}
```

- [ ] **Step 4: Write failing JSON helper tests**

Create `scripts/lib/weekly-json.test.mjs`:

```js
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readJsonFile, writeJsonFileStable } from "./weekly-json.mjs";

const tempDirs = [];

async function makeTempDir() {
  const dirPath = await mkdtemp(join(tmpdir(), "weekly-json-"));
  tempDirs.push(dirPath);
  return dirPath;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dirPath) => rm(dirPath, { force: true, recursive: true })));
});

describe("weekly JSON helpers", () => {
  it("reads JSON with a clear file path in parse errors", async () => {
    const dirPath = await makeTempDir();
    const filePath = join(dirPath, "bad.json");
    await writeFile(filePath, "{bad");

    await expect(readJsonFile(filePath)).rejects.toThrow(filePath);
  });

  it("writes stable UTF-8 JSON with a trailing newline", async () => {
    const dirPath = await makeTempDir();
    const filePath = join(dirPath, "cards.json");
    await writeJsonFileStable(filePath, { title: "中文标题", items: [1] });

    expect(await readFile(filePath, "utf8")).toBe('{\n  "title": "中文标题",\n  "items": [\n    1\n  ]\n}\n');
  });
});
```

- [ ] **Step 5: Implement `weekly-json.mjs`**

```js
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function readJsonFile(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Failed to read JSON ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function writeJsonFileStable(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
```

- [ ] **Step 6: Run helper tests**

Run:

```bash
npm test -- scripts/lib/weekly-paths.test.mjs scripts/lib/weekly-json.test.mjs
```

Expected: pass.

---

## Task 2: Weekly Plan Builder

**Files:**

- Create: `scripts/lib/weekly-plan.mjs`
- Create: `scripts/lib/weekly-plan.test.mjs`

- [ ] **Step 1: Write failing weekly plan tests**

Create `scripts/lib/weekly-plan.test.mjs`:

```js
import { describe, expect, it } from "vitest";
import {
  buildNextWeekDates,
  createCardId,
  createWeeklyPlan,
  inferNextWeekId,
} from "./weekly-plan.mjs";

const cards = [
  { id: "2026-05-26-database-index", cardDate: "2026-05-26", category: "工程技术", title: "数据库索引为什么能让查询变快" },
  { id: "2026-05-27-anchoring-effect", cardDate: "2026-05-27", category: "人文社科", title: "锚定效应为什么会影响价格判断" },
];

describe("buildNextWeekDates", () => {
  it("starts from the day after the latest local card date", () => {
    expect(buildNextWeekDates(cards)).toEqual([
      "2026-05-28",
      "2026-05-29",
      "2026-05-30",
      "2026-05-31",
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
    ]);
  });
});

describe("inferNextWeekId", () => {
  it("uses the generated date range", () => {
    expect(inferNextWeekId(cards)).toBe("2026-05-28_to_2026-06-03");
  });
});

describe("createCardId", () => {
  it("uses date plus an ASCII slug", () => {
    expect(createCardId("2026-05-28", "订阅收入为什么更稳定")).toBe("2026-05-28-subscription-revenue");
  });

  it("falls back to topic when no dictionary match exists", () => {
    expect(createCardId("2026-05-28", "未知标题")).toBe("2026-05-28-topic");
  });
});

describe("createWeeklyPlan", () => {
  it("creates seven pending cards without mutating source cards", () => {
    const plan = createWeeklyPlan(cards, { now: "2026-05-21T15:30:00+08:00" });

    expect(plan.weekId).toBe("2026-05-28_to_2026-06-03");
    expect(plan.cards).toHaveLength(7);
    expect(plan.cards[0]).toMatchObject({
      cardDate: "2026-05-28",
      image: { status: "pending" },
      podcast: { status: "pending", version: 1, targetDurationSec: 180 },
    });
    expect(cards).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Implement deterministic MVP planning**

Create `scripts/lib/weekly-plan.mjs`:

```js
const categoryRotation = [
  { day: "周一", category: "自然科学" },
  { day: "周二", category: "工程技术" },
  { day: "周三", category: "人文社科" },
  { day: "周四", category: "商业金融" },
  { day: "周五", category: "历史文明" },
  { day: "周六", category: "艺术设计" },
  { day: "周日", category: "综合冷知识" },
];

const titleSlugMap = new Map([
  ["订阅收入为什么更稳定", "subscription-revenue"],
  ["驿站网络为什么能加快信息传递", "post-station-network"],
  ["字体字重为什么会影响阅读感受", "font-weight"],
  ["飞机圆角窗为什么更安全", "rounded-airplane-windows"],
  ["洋流为什么会影响全球气候", "ocean-currents-climate"],
  ["数据库索引为什么能让查询变快", "database-index"],
  ["锚定效应为什么会影响价格判断", "anchoring-effect"],
]);

const defaultTopics = [
  { title: "订阅收入为什么更稳定", subtitle: "经常性收入如何改变企业质量", category: "商业金融", subCategory: "商业模式" },
  { title: "驿站网络为什么能加快信息传递", subtitle: "古代通信系统的节点效率", category: "历史文明", subCategory: "治理网络" },
  { title: "字体字重为什么会影响阅读感受", subtitle: "信息层级与视觉重量", category: "艺术设计", subCategory: "排版设计" },
  { title: "飞机圆角窗为什么更安全", subtitle: "应力集中与工程安全", category: "工程技术", subCategory: "结构设计" },
  { title: "洋流为什么会影响全球气候", subtitle: "海洋输送热量的方式", category: "自然科学", subCategory: "气候系统" },
  { title: "数据库索引为什么能让查询变快", subtitle: "用空间换时间的数据结构", category: "工程技术", subCategory: "数据库" },
  { title: "锚定效应为什么会影响价格判断", subtitle: "第一印象如何改变估值", category: "人文社科", subCategory: "行为心理" },
];

function addDays(dateString, offset) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function buildNextWeekDates(cards) {
  const latestDate = cards.map((card) => card.cardDate).sort().at(-1);
  if (!latestDate) throw new Error("Cannot infer next week because data/cards.json is empty");
  return Array.from({ length: 7 }, (_, index) => addDays(latestDate, index + 1));
}

export function inferNextWeekId(cards) {
  const dates = buildNextWeekDates(cards);
  return `${dates[0]}_to_${dates[6]}`;
}

export function createCardId(cardDate, title) {
  return `${cardDate}-${titleSlugMap.get(title) ?? "topic"}`;
}

export function createWeeklyPlan(cards, { now = new Date().toISOString() } = {}) {
  const dates = buildNextWeekDates(cards);
  const weekId = `${dates[0]}_to_${dates[6]}`;
  return {
    weekId,
    createdAt: now,
    updatedAt: now,
    status: "created",
    cards: dates.map((cardDate, index) => {
      const topic = defaultTopics[index];
      const cardId = createCardId(cardDate, topic.title);
      const category = topic.category || categoryRotation[index % categoryRotation.length].category;
      return {
        cardId,
        cardDate,
        category,
        subCategory: topic.subCategory,
        difficulty: "入门",
        title: topic.title,
        subtitle: topic.subtitle,
        summary: `${topic.title}的核心机制摘要。`,
        keywords: [topic.subCategory, category],
        content: {
          title: topic.title,
          subtitle: topic.subtitle,
          category,
          subCategory: topic.subCategory,
          difficulty: "入门",
          summary: `${topic.title}的核心机制摘要。`,
          coreMechanism: "用一个清晰机制解释现象背后的因果关系。",
          whyImportant: ["帮助理解问题本质。", "便于迁移到工作和投资判断。", "适合通过图文和播客复习。"],
          processSteps: [
            { step: 1, title: "识别现象", desc: "先看表面现象。" },
            { step: 2, title: "解释机制", desc: "再拆解因果链条。" },
            { step: 3, title: "迁移应用", desc: "最后连接到现实判断。" }
          ],
          keywords: [
            { term: topic.subCategory, desc: "本期知识卡的核心关键词。" }
          ],
          misconception: { title: "常见误区", content: "不要只记结论，要理解机制。" },
          financeAngle: "从现金流、效率、风险或决策质量角度理解这个知识点。",
          memoryHooks: ["先机制，后应用。"],
          thinkingQuestions: [
            { level: "概念理解", question: "这个知识点解释了什么现象？", answer: "它解释了现象背后的关键机制。", keyPoint: "理解核心概念" },
            { level: "因果分析", question: "为什么这个机制会产生影响？", answer: "因为它改变了成本、效率、风险或认知判断。", keyPoint: "理解因果链条" },
            { level: "迁移应用", question: "如何把它用于现实判断？", answer: "把机制映射到具体场景中的变量。", keyPoint: "迁移能力" }
          ],
          conclusion: "理解机制比记住单点结论更重要。"
        },
        image: {
          status: "pending",
          rawPath: `automation/weekly/${weekId}/images/raw/${cardId}.png`,
          publishedUrl: null,
          sizeBytes: null,
          checksum: null
        },
        podcast: {
          status: "pending",
          version: 1,
          title: topic.title,
          targetDurationSec: 180,
          pendingDir: `automation/weekly/${weekId}/podcast_jobs/pending/${cardId}`,
          doneDir: `automation/weekly/${weekId}/podcast_jobs/done/${cardId}`,
          audioUrl: null,
          transcriptUrl: null,
          duration: null,
          sizeBytes: null,
          checksum: null
        }
      };
    })
  };
}
```

- [ ] **Step 3: Run plan tests**

Run:

```bash
npm test -- scripts/lib/weekly-plan.test.mjs
```

Expected: pass.

---

## Task 3: `weekly:create`

**Files:**

- Create: `scripts/weekly-create.mjs`
- Create: `scripts/weekly-create.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing tests for non-destructive creation**

Create `scripts/weekly-create.test.mjs`:

```js
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runWeeklyCreate } from "./weekly-create.mjs";

const tempDirs = [];

async function makeFixtureProject() {
  const { mkdtemp } = await import("node:fs/promises");
  const root = await mkdtemp(join(tmpdir(), "weekly-create-"));
  tempDirs.push(root);
  await mkdir(join(root, "data"), { recursive: true });
  await writeFile(join(root, "data/cards.json"), JSON.stringify([
    { id: "2026-05-27-anchoring-effect", cardDate: "2026-05-27", category: "人文社科", title: "锚定效应为什么会影响价格判断" }
  ], null, 2));
  return root;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dirPath) => rm(dirPath, { force: true, recursive: true })));
});

describe("runWeeklyCreate", () => {
  it("creates weekly workspace files without modifying data/cards.json", async () => {
    const root = await makeFixtureProject();
    const beforeCards = await readFile(join(root, "data/cards.json"), "utf8");

    const result = await runWeeklyCreate({ projectRoot: root, now: "2026-05-21T15:30:00+08:00" });

    expect(result.weekId).toBe("2026-05-28_to_2026-06-03");
    expect(await readFile(join(root, "data/cards.json"), "utf8")).toBe(beforeCards);
    expect(await readFile(join(root, "automation/weekly/2026-05-28_to_2026-06-03/weekly-plan.json"), "utf8")).toContain("\"cards\"");
    expect(await readFile(join(root, "automation/weekly/2026-05-28_to_2026-06-03/image2-prompts.md"), "utf8")).toContain("保存文件名");
    expect(await readFile(join(root, "automation/weekly/2026-05-28_to_2026-06-03/handoff-to-windows.md"), "utf8")).toContain("D:\\\\AI-Podcast");
  });
});
```

- [ ] **Step 2: Implement `runWeeklyCreate`**

The implementation must:

- read `data/cards.json`
- create `automation/weekly/{weekId}/`
- create `images/raw`, `podcast_jobs/pending`, `podcast_jobs/done`, `podcast_jobs/failed`
- write `weekly-plan.json`
- write `image2-prompts.md`
- write podcast pending package for each card: `script.md`, `script.srt`, `podcast.meta.json`
- write `handoff-to-windows.md`
- append `mac-run-log.md`
- not write `data/cards.json`

- [ ] **Step 3: Add package script**

Modify `package.json`:

```json
"weekly:create": "node scripts/weekly-create.mjs"
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- scripts/weekly-create.test.mjs
npm run weekly:create
```

Expected:

- test passes
- command creates a weekly workspace
- `data/cards.json` diff is unchanged by `weekly:create`

---

## Task 4: Import Weekly Images

**Files:**

- Create: `scripts/import-weekly-images.mjs`
- Create: `scripts/import-weekly-images.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing no-overwrite tests**

Test requirements:

- missing `weekId` throws `weekId is required`
- missing `weekly-plan.json` throws with the path
- missing `{cardId}.png` throws with cardId
- existing destination with same checksum is idempotent
- existing destination with different checksum throws and does not overwrite
- plan image status becomes `imported`

- [ ] **Step 2: Implement import**

Implementation rules:

- source: `automation/weekly/{weekId}/images/raw/{cardId}.png`
- destination for new cards: `public/generated-cards/{cardId}.png`
- use `copyFile` only after checking destination
- if destination exists with different checksum, stop with clear error
- update `weekly-plan.json` image fields:

```json
{
  "status": "imported",
  "publishedUrl": "/generated-cards/{cardId}.png",
  "sizeBytes": 123,
  "checksum": "sha256-..."
}
```

- [ ] **Step 3: Add package script**

Modify `package.json`:

```json
"weekly:import-images": "node scripts/import-weekly-images.mjs"
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- scripts/import-weekly-images.test.mjs
```

Expected: pass.

---

## Task 5: Import Podcast Audio

**Files:**

- Create: `scripts/import-podcast-audio.mjs`
- Create: `scripts/import-podcast-audio.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing audio import tests**

Test requirements:

- missing done package throws with cardId
- missing mp3 throws with expected filename
- missing transcript throws with expected filename
- invalid `podcast.meta.json` throws with required fields
- destination audio is never overwritten with different bytes
- existing destination with same checksum is idempotent
- updates `data/podcast-manifest.json`
- updates `weekly-plan.json`

- [ ] **Step 2: Implement import**

Implementation rules:

- source audio: `automation/weekly/{weekId}/podcast_jobs/done/{cardId}/{cardId}-podcast-v{version}.mp3`
- source transcript: `automation/weekly/{weekId}/podcast_jobs/done/{cardId}/transcript.md`
- destination audio: `public/audio/published/{cardId}-podcast-v{version}.mp3`
- destination transcript: `public/transcripts/published/{cardId}-podcast-v{version}.md`
- update manifest item by `cardId + version`
- checksum format must be `sha256-${hex}`
- duration can come from `podcast.meta.json.duration`; if absent, set `duration: null`

- [ ] **Step 3: Add package script**

Modify `package.json`:

```json
"weekly:import-audio": "node scripts/import-podcast-audio.mjs"
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- scripts/import-podcast-audio.test.mjs
```

Expected: pass.

---

## Task 6: Continue Into Formal `cards.json`

**Files:**

- Create: `scripts/weekly-continue.mjs`
- Create: `scripts/weekly-continue.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing formal write tests**

Test requirements:

- refuses to run if any card image is not `imported`
- refuses to run if any podcast is not `published`
- appends new cards once
- rerunning does not duplicate cards
- preserves readable Chinese text
- preserves existing cards and existing fields
- writes `podcast` field for new cards
- updates `data/podcast-manifest.json`

- [ ] **Step 2: Implement formal writer**

Implementation rules:

- read `weekly-plan.json`
- read current `data/cards.json`
- build new `AppKnowledgeCard` records from plan
- if card id already exists, leave it unchanged in MVP v1 and log `skipped existing card`
- append only missing cards
- write using `writeJsonFileStable`
- after writing, read back the exact new card IDs and assert:
  - title does not contain literal `?`
  - category does not contain literal `?`
  - summary does not contain literal `?`
  - imageUrl maps to an existing file
  - podcast audio and transcript URLs map to existing files

- [ ] **Step 3: Add package script**

Modify `package.json`:

```json
"weekly:continue": "node scripts/weekly-continue.mjs"
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- scripts/weekly-continue.test.mjs src/lib/local-data.test.ts
```

Expected: pass.

---

## Task 7: Archive Assets

**Files:**

- Create: `scripts/archive-assets.mjs`
- Create: `scripts/archive-assets.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing archive tests**

Test requirements:

- archives by copying to `public/archive/...`, not deleting source
- refuses to overwrite an existing archive file with different bytes
- updates `data/archive-manifest.json`
- can mark podcast as `withdrawn`
- rollback creates a new published version rather than decrementing version

- [ ] **Step 2: Implement MVP archive commands**

Implement CLI modes:

```bash
npm run weekly:archive -- --type podcast --cardId 2026-05-28-topic --version 1 --reason "新版本发布"
npm run weekly:archive -- --withdraw --cardId 2026-05-28-topic --reason "内容修订"
```

Rules:

- no deletion
- no overwrite
- archive manifest is append-only by unique `cardId + assetType + version + archiveUrl`
- withdrawn updates `data/cards.json` status only after archive manifest write succeeds

- [ ] **Step 3: Add package script**

Modify `package.json`:

```json
"weekly:archive": "node scripts/archive-assets.mjs"
```

- [ ] **Step 4: Verify**

Run:

```bash
npm test -- scripts/archive-assets.test.mjs
```

Expected: pass.

---

## Task 8: Strengthen Validation

**Files:**

- Modify: `scripts/validate-weekly-assets.mjs`
- Create or modify: `scripts/validate-weekly-assets.test.mjs`

- [ ] **Step 1: Write failing validation tests**

Test requirements:

- validates every `imageUrl` in `data/cards.json`
- validates every published podcast `audioUrl`
- validates every published podcast `transcriptUrl`
- validates `data/podcast-manifest.json` matches published podcasts in cards
- fails if Chinese-heavy new cards contain literal `?`

- [ ] **Step 2: Implement validation**

Rules:

- no writes
- output all errors before exiting
- exit code 1 if any validation error exists
- include exact cardId and path in error messages

- [ ] **Step 3: Verify**

Run:

```bash
npm test -- scripts/validate-weekly-assets.test.mjs
npm run weekly:validate
```

Expected: pass.

---

## Task 9: End-to-End Single-Card Fixture

**Files:**

- Create: `scripts/weekly-e2e.test.mjs`

- [ ] **Step 1: Build one-card fixture test**

The test must simulate:

1. `runWeeklyCreate`
2. place one fixture png into `images/raw`
3. `runImportWeeklyImages`
4. place one fixture mp3, transcript, and meta into `podcast_jobs/done`
5. `runImportPodcastAudio`
6. `runWeeklyContinue`
7. assert one card appended
8. rerun `runWeeklyContinue`
9. assert no duplicate append

- [ ] **Step 2: Run e2e fixture**

Run:

```bash
npm test -- scripts/weekly-e2e.test.mjs
```

Expected: pass.

---

## Task 10: Final Verification

**Files:**

- No new files unless tests expose a gap.

- [ ] **Step 1: Run all tests**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run capacity check**

Run:

```bash
npm run site:capacity
```

Expected:

- prints `public/generated-cards`
- prints `public/audio`
- prints `public/transcripts`
- prints `public/archive`
- prints `public`
- status is OK or WARNING; BLOCKED requires stopping and asking user before deployment work

- [ ] **Step 3: Run weekly validation**

Run:

```bash
npm run weekly:validate
```

Expected: pass.

- [ ] **Step 4: Run build**

Run:

```bash
npm run build
```

Expected: pass. If sandbox fails with Turbopack `Operation not permitted`, rerun with approved non-sandbox execution and record both outcomes.

- [ ] **Step 5: Browser smoke test**

Start:

```bash
npm run dev
```

Verify:

- homepage loads
- library list loads
- detail page loads
- old card without podcast does not show podcast panel
- published podcast card shows audio player
- withdrawn podcast card does not show audio player
- complete/favorite/review buttons still work in mock mode or real Supabase mode

---

## Release Gates

Do not proceed to Git commit or deployment unless all are true:

- `npm test` passes
- `npm run build` passes or non-sandbox build passes with sandbox failure documented
- `npm run site:capacity` is not BLOCKED
- `npm run weekly:validate` passes
- no generated dependency folders are tracked
- no `.env.local` or secrets are tracked
- user explicitly approves `git push` or deployment work

## Known Implementation Risk

The highest-risk step is `weekly-continue`, because it writes `data/cards.json`. Implement it after all import scripts and validation helpers pass, keep it idempotent, and read back the written JSON immediately to catch Chinese text corruption before build or deploy.
