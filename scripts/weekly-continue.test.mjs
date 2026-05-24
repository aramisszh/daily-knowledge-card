import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runWeeklyContinue, weeklyContinueInternals } from "./weekly-continue.mjs";

const TEMP_DIRS = [];
const WEEK_ID = "2026-05-22_to_2026-05-28";
const CARD_ID = "2026-05-22-post-station-network";

afterEach(async () => {
  weeklyContinueInternals.writeTextFileAtomically =
    weeklyContinueInternals.defaultWriteTextFileAtomically;
  await Promise.all(
    TEMP_DIRS.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

function buildExistingCard() {
  return {
    id: "2026-05-21-existing-card",
    title: "已有知识卡",
    subtitle: "旧内容",
    category: "商业金融",
    subCategory: "商业模式",
    difficulty: "入门",
    cardDate: "2026-05-21",
    imageUrl: "/generated-cards/2026-05-21-existing-card.png",
    summary: "这是一张已有卡片。",
    keywords: ["已有"],
    completed: true,
    favorite: true,
    needReview: true,
    userLocalField: "preserve-me",
    content: {
      title: "已有知识卡",
      subtitle: "旧内容",
      category: "商业金融",
      subCategory: "商业模式",
      difficulty: "入门",
      summary: "这是一张已有卡片。",
      coreMechanism: "旧机制",
      whyImportant: ["旧要点"],
      keywords: [{ term: "已有", desc: "旧关键词" }],
      misconception: { title: "旧误区", content: "旧说明" },
      financeAngle: "旧财务视角",
      memoryHooks: ["旧钩子"],
      thinkingQuestions: [
        {
          level: "概念理解",
          question: "旧问题",
          answer: "旧答案",
          keyPoint: "旧考点",
        },
      ],
      conclusion: "旧结论",
    },
  };
}

function buildPlanCard(overrides = {}) {
  return {
    cardId: CARD_ID,
    cardDate: "2026-05-22",
    category: "历史文明",
    subCategory: "基础设施",
    difficulty: "入门",
    title: "驿站网络为什么能加快信息传递",
    subtitle: "分段接力如何缩短长距离通信时间",
    summary: "把长途通信拆成标准化节点接力，速度和可靠性都会提升。",
    keywords: ["驿站", "接力", "网络"],
    content: {
      title: "驿站网络为什么能加快信息传递",
      subtitle: "分段接力如何缩短长距离通信时间",
      category: "历史文明",
      subCategory: "基础设施",
      difficulty: "入门",
      summary: "把长途通信拆成标准化节点接力，速度和可靠性都会提升。",
      coreMechanism: "信息在固定节点换马、换人、换补给。",
      whyImportant: ["命令更快触达地方。", "标准化节点提升效率。"],
      processSteps: [{ step: 1, title: "设置节点", desc: "沿路线布设驿站。" }],
      keywords: [
        { term: "驿站", desc: "中转节点。" },
        { term: "接力", desc: "分段完成任务。" },
      ],
      misconception: { title: "常见误区", content: "快的关键不是单匹马更快。" },
      financeAngle: "类似企业用节点管理提升周转效率。",
      memoryHooks: ["古代版高速服务区。"],
      thinkingQuestions: [
        {
          level: "迁移应用",
          question: "为什么分段交接更高效？",
          answer: "每一段都能保持更好状态。",
          keyPoint: "系统优化比单点提速更有效。",
        },
      ],
      conclusion: "驿站网络把长链路改造成高效接力系统。",
    },
    image: {
      status: "imported",
      publishedUrl: `/generated-cards/${CARD_ID}.png`,
      sizeBytes: 9,
      checksum: "sha256-image",
    },
    podcast: {
      status: "published",
      version: 1,
      title: "驿站网络为什么能加快信息传递",
      targetDurationSec: 180,
      audioUrl: `/audio/published/${CARD_ID}-podcast-v1.mp3`,
      transcriptUrl: `/transcripts/published/${CARD_ID}-podcast-v1.md`,
      duration: 188,
      sizeBytes: 11,
      checksum: "sha256-audio",
    },
    ...overrides,
  };
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function createFixtureProject({ planCards = [buildPlanCard()], cards } = {}) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "weekly-continue-test-"));
  TEMP_DIRS.push(projectRoot);

  const weekDir = path.join(projectRoot, "automation", "weekly", WEEK_ID);
  const dataDir = path.join(projectRoot, "data");
  const generatedCardsDir = path.join(projectRoot, "public", "generated-cards");
  const audioDir = path.join(projectRoot, "public", "audio", "published");
  const transcriptsDir = path.join(projectRoot, "public", "transcripts", "published");

  await mkdir(weekDir, { recursive: true });
  await mkdir(dataDir, { recursive: true });
  await mkdir(generatedCardsDir, { recursive: true });
  await mkdir(audioDir, { recursive: true });
  await mkdir(transcriptsDir, { recursive: true });

  for (const card of planCards) {
    if (card?.image?.publishedUrl) {
      await writeFile(path.join(projectRoot, "public", card.image.publishedUrl.slice(1)), "image");
    }
    if (card?.podcast?.audioUrl) {
      await writeFile(path.join(projectRoot, "public", card.podcast.audioUrl.slice(1)), "audio");
    }
    if (card?.podcast?.transcriptUrl) {
      await writeFile(
        path.join(projectRoot, "public", card.podcast.transcriptUrl.slice(1)),
        "# Transcript\n",
        "utf8",
      );
    }
  }

  const weeklyPlanPath = path.join(weekDir, "weekly-plan.json");
  const cardsPath = path.join(dataDir, "cards.json");
  const manifestPath = path.join(dataDir, "podcast-manifest.json");

  await writeJson(weeklyPlanPath, {
    weekId: WEEK_ID,
    createdAt: "2026-05-21T09:30:00.000Z",
    updatedAt: "2026-05-21T09:30:00.000Z",
    status: "audio-imported",
    cards: planCards,
  });
  await writeJson(cardsPath, cards ?? [buildExistingCard()]);
  await writeJson(manifestPath, {
    updatedAt: "2026-05-21T09:30:00.000Z",
    items: [
      {
        cardId: CARD_ID,
        version: 1,
        status: "draft",
        note: "keep-me",
      },
      {
        cardId: "2026-01-01-unrelated",
        version: 1,
        status: "published",
        title: "不相关",
      },
    ],
  });

  const firstPlanCard = planCards[0] ?? buildPlanCard();

  return {
    projectRoot,
    weeklyPlanPath,
    cardsPath,
    manifestPath,
    imagePath: path.join(projectRoot, "public", firstPlanCard.image.publishedUrl.slice(1)),
    audioPath: path.join(projectRoot, "public", firstPlanCard.podcast.audioUrl.slice(1)),
    transcriptPath: path.join(
      projectRoot,
      "public",
      firstPlanCard.podcast.transcriptUrl.slice(1),
    ),
  };
}

describe("runWeeklyContinue", () => {
  it("throws when weekId is missing", async () => {
    await expect(runWeeklyContinue()).rejects.toThrow("weekId is required");
  });

  it("throws on invalid weekId before touching formal JSON files", async () => {
    const { projectRoot, cardsPath, manifestPath } = await createFixtureProject();
    const cardsTextBefore = await readFile(cardsPath, "utf8");
    const manifestTextBefore = await readFile(manifestPath, "utf8");

    await expect(
      runWeeklyContinue({ projectRoot, weekId: "../bad" }),
    ).rejects.toThrow("Invalid weekId");

    expect(await readFile(cardsPath, "utf8")).toBe(cardsTextBefore);
    expect(await readFile(manifestPath, "utf8")).toBe(manifestTextBefore);
  });

  it("refuses duplicate card ids in a single weekly plan before writing", async () => {
    const duplicateCard = {
      ...buildPlanCard(),
      subtitle: "重复卡片",
    };
    const { projectRoot, cardsPath, manifestPath } = await createFixtureProject({
      planCards: [buildPlanCard(), duplicateCard],
    });
    const cardsTextBefore = await readFile(cardsPath, "utf8");
    const manifestTextBefore = await readFile(manifestPath, "utf8");

    await expect(
      runWeeklyContinue({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow("Duplicate cardId");

    expect(await readFile(cardsPath, "utf8")).toBe(cardsTextBefore);
    expect(await readFile(manifestPath, "utf8")).toBe(manifestTextBefore);
  });

  it("refuses cards missing required formal fields before writing", async () => {
    const invalidCard = buildPlanCard({
      title: "",
      content: {
        ...buildPlanCard().content,
        title: "",
      },
    });
    const { projectRoot, cardsPath, manifestPath } = await createFixtureProject({
      planCards: [invalidCard],
    });
    const cardsTextBefore = await readFile(cardsPath, "utf8");
    const manifestTextBefore = await readFile(manifestPath, "utf8");

    await expect(
      runWeeklyContinue({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow("title");

    expect(await readFile(cardsPath, "utf8")).toBe(cardsTextBefore);
    expect(await readFile(manifestPath, "utf8")).toBe(manifestTextBefore);
  });

  it("refuses cards with incomplete KnowledgePack content before writing", async () => {
    const invalidCard = buildPlanCard({
      content: {
        title: "只有标题",
        subtitle: "缺少数组字段",
        category: "历史文明",
        subCategory: "基础设施",
        difficulty: "入门",
        summary: "缺少 whyImportant 和 thinkingQuestions。",
      },
    });
    const { projectRoot, cardsPath, manifestPath } = await createFixtureProject({
      planCards: [invalidCard],
    });
    const cardsTextBefore = await readFile(cardsPath, "utf8");
    const manifestTextBefore = await readFile(manifestPath, "utf8");

    await expect(
      runWeeklyContinue({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow("content.coreMechanism");

    expect(await readFile(cardsPath, "utf8")).toBe(cardsTextBefore);
    expect(await readFile(manifestPath, "utf8")).toBe(manifestTextBefore);
  });

  it("refuses to run if any card image is not imported and leaves cards unchanged", async () => {
    const planCard = buildPlanCard({
      image: {
        ...buildPlanCard().image,
        status: "pending",
      },
    });
    const { projectRoot, cardsPath } = await createFixtureProject({ planCards: [planCard] });
    const cardsTextBefore = await readFile(cardsPath, "utf8");

    await expect(
      runWeeklyContinue({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow("image is not imported");

    expect(await readFile(cardsPath, "utf8")).toBe(cardsTextBefore);
  });

  it("refuses to run if any podcast is not published and leaves cards unchanged", async () => {
    const planCard = buildPlanCard({
      podcast: {
        ...buildPlanCard().podcast,
        status: "withdrawn",
      },
    });
    const { projectRoot, cardsPath } = await createFixtureProject({ planCards: [planCard] });
    const cardsTextBefore = await readFile(cardsPath, "utf8");

    await expect(
      runWeeklyContinue({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow("podcast is not published");

    expect(await readFile(cardsPath, "utf8")).toBe(cardsTextBefore);
  });

  it("refuses when imported image file is missing", async () => {
    const { projectRoot, cardsPath, manifestPath, imagePath } = await createFixtureProject();
    await unlink(imagePath);
    const cardsTextBefore = await readFile(cardsPath, "utf8");
    const manifestTextBefore = await readFile(manifestPath, "utf8");

    await expect(
      runWeeklyContinue({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow("Missing image");

    expect(await readFile(cardsPath, "utf8")).toBe(cardsTextBefore);
    expect(await readFile(manifestPath, "utf8")).toBe(manifestTextBefore);
  });

  it("refuses when podcast audio file is missing", async () => {
    const { projectRoot, cardsPath, manifestPath, audioPath } = await createFixtureProject();
    await unlink(audioPath);
    const cardsTextBefore = await readFile(cardsPath, "utf8");
    const manifestTextBefore = await readFile(manifestPath, "utf8");

    await expect(
      runWeeklyContinue({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow("Missing podcast audio");

    expect(await readFile(cardsPath, "utf8")).toBe(cardsTextBefore);
    expect(await readFile(manifestPath, "utf8")).toBe(manifestTextBefore);
  });

  it("refuses when podcast transcript file is missing", async () => {
    const { projectRoot, cardsPath, manifestPath, transcriptPath } = await createFixtureProject();
    await unlink(transcriptPath);
    const cardsTextBefore = await readFile(cardsPath, "utf8");
    const manifestTextBefore = await readFile(manifestPath, "utf8");

    await expect(
      runWeeklyContinue({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow("Missing podcast transcript");

    expect(await readFile(cardsPath, "utf8")).toBe(cardsTextBefore);
    expect(await readFile(manifestPath, "utf8")).toBe(manifestTextBefore);
  });

  it("appends new cards once, preserves existing cards, and writes podcast data", async () => {
    const { projectRoot, cardsPath, manifestPath } = await createFixtureProject();
    const existingTextBefore = await readFile(cardsPath, "utf8");

    const result = await runWeeklyContinue({
      projectRoot,
      weekId: WEEK_ID,
      now: "2026-05-21T12:00:00.000Z",
    });

    expect(result).toMatchObject({
      appendedCount: 1,
      skippedExistingCount: 0,
    });

    const cards = await readJson(cardsPath);
    expect(cards).toHaveLength(2);
    expect(cards[0]).toEqual(JSON.parse(existingTextBefore)[0]);

    const newCard = cards.find((card) => card.id === CARD_ID);
    expect(newCard).toMatchObject({
      id: CARD_ID,
      title: "驿站网络为什么能加快信息传递",
      category: "历史文明",
      subCategory: "基础设施",
      difficulty: "入门",
      cardDate: "2026-05-22",
      imageUrl: `/generated-cards/${CARD_ID}.png`,
      completed: false,
      favorite: false,
      needReview: false,
      podcast: {
        status: "published",
        version: 1,
        audioUrl: `/audio/published/${CARD_ID}-podcast-v1.mp3`,
        transcriptUrl: `/transcripts/published/${CARD_ID}-podcast-v1.md`,
        duration: 188,
        sizeBytes: 11,
        checksum: "sha256-audio",
        updatedAt: "2026-05-21T12:00:00.000Z",
        archivedVersions: [],
      },
    });
    expect(newCard.title.includes("?")).toBe(false);
    expect(newCard.category.includes("?")).toBe(false);
    expect(newCard.summary.includes("?")).toBe(false);

    const manifest = await readJson(manifestPath);
    expect(manifest.updatedAt).toBe("2026-05-21T12:00:00.000Z");
    expect(manifest.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cardId: CARD_ID,
          version: 1,
          status: "published",
          title: "驿站网络为什么能加快信息传递",
          audioUrl: `/audio/published/${CARD_ID}-podcast-v1.mp3`,
          transcriptUrl: `/transcripts/published/${CARD_ID}-podcast-v1.md`,
          note: "keep-me",
        }),
        expect.objectContaining({
          cardId: "2026-01-01-unrelated",
          title: "不相关",
        }),
      ]),
    );
  });

  it("does not duplicate existing cards on rerun", async () => {
    const { projectRoot, cardsPath, manifestPath } = await createFixtureProject();
    await runWeeklyContinue({
      projectRoot,
      weekId: WEEK_ID,
      now: "2026-05-21T12:00:00.000Z",
    });
    const cardsTextAfterFirstRun = await readFile(cardsPath, "utf8");
    const manifestTextAfterFirstRun = await readFile(manifestPath, "utf8");

    const result = await runWeeklyContinue({
      projectRoot,
      weekId: WEEK_ID,
      now: "2026-05-22T12:00:00.000Z",
    });

    expect(result.appendedCount).toBe(0);
    expect(result.skippedExistingCount).toBe(1);
    expect(await readFile(cardsPath, "utf8")).toBe(cardsTextAfterFirstRun);
    expect(await readFile(manifestPath, "utf8")).toBe(manifestTextAfterFirstRun);
  });

  it("restores podcast manifest if data/cards.json write fails", async () => {
    const { projectRoot, cardsPath, manifestPath } = await createFixtureProject();
    const cardsTextBefore = await readFile(cardsPath, "utf8");
    const manifestTextBefore = await readFile(manifestPath, "utf8");
    const originalWriter = weeklyContinueInternals.writeTextFileAtomically;
    let manifestWriteCount = 0;

    weeklyContinueInternals.writeTextFileAtomically = async (filePath, text) => {
      if (filePath === manifestPath) {
        manifestWriteCount += 1;
        return originalWriter(filePath, text);
      }

      if (filePath === cardsPath) {
        throw new Error("Injected cards write failure");
      }

      return originalWriter(filePath, text);
    };

    await expect(
      runWeeklyContinue({
        projectRoot,
        weekId: WEEK_ID,
        now: "2026-05-21T12:00:00.000Z",
      }),
    ).rejects.toThrow("Injected cards write failure");

    expect(manifestWriteCount).toBe(2);
    expect(await readFile(cardsPath, "utf8")).toBe(cardsTextBefore);
    expect(await readFile(manifestPath, "utf8")).toBe(manifestTextBefore);
  });

  it("skips an existing card id without overwriting non-podcast fields", async () => {
    const existingCard = {
      ...buildExistingCard(),
      id: CARD_ID,
      title: "用户已经存在的正式卡片",
      completed: true,
      favorite: true,
    };
    const { projectRoot, cardsPath } = await createFixtureProject({ cards: [existingCard] });

    const result = await runWeeklyContinue({
      projectRoot,
      weekId: WEEK_ID,
      now: "2026-05-21T12:00:00.000Z",
    });

    expect(result).toMatchObject({
      appendedCount: 0,
      skippedExistingCount: 1,
    });
    expect(await readJson(cardsPath)).toEqual([
      expect.objectContaining({
        ...existingCard,
        podcast: expect.objectContaining({
          status: "published",
          audioUrl: `/audio/published/${CARD_ID}-podcast-v1.mp3`,
          transcriptUrl: `/transcripts/published/${CARD_ID}-podcast-v1.md`,
        }),
      }),
    ]);
  });

  it("updates podcast data for an existing card without overwriting user fields", async () => {
    const existingCard = {
      ...buildExistingCard(),
      id: CARD_ID,
      title: "用户已经存在的正式卡片",
      completed: true,
      favorite: true,
      needReview: true,
    };
    const { projectRoot, cardsPath } = await createFixtureProject({ cards: [existingCard] });

    const result = await runWeeklyContinue({
      projectRoot,
      weekId: WEEK_ID,
      now: "2026-05-21T12:00:00.000Z",
    });

    expect(result).toMatchObject({
      appendedCount: 0,
      skippedExistingCount: 1,
    });

    const [updatedCard] = await readJson(cardsPath);
    expect(updatedCard).toMatchObject({
      id: CARD_ID,
      title: "用户已经存在的正式卡片",
      completed: true,
      favorite: true,
      needReview: true,
      userLocalField: "preserve-me",
      podcast: {
        status: "published",
        version: 1,
        audioUrl: `/audio/published/${CARD_ID}-podcast-v1.mp3`,
        transcriptUrl: `/transcripts/published/${CARD_ID}-podcast-v1.md`,
        duration: 188,
        sizeBytes: 11,
        checksum: "sha256-audio",
        updatedAt: "2026-05-21T12:00:00.000Z",
        archivedVersions: [],
      },
    });
  });
});

describe("weekly-continue CLI", () => {
  it("prints appended and skipped counts", async () => {
    const { projectRoot } = await createFixtureProject();
    const scriptPath = path.resolve("scripts/weekly-continue.mjs");

    const result = spawnSync(process.execPath, [scriptPath, WEEK_ID], {
      cwd: projectRoot,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("appended 1");
    expect(result.stdout).toContain("skipped 0");
  });
});
