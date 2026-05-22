import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runImportPodcastAudio } from "./import-podcast-audio.mjs";
import { runImportWeeklyImages } from "./import-weekly-images.mjs";
import { runWeeklyContinue } from "./weekly-continue.mjs";
import { runWeeklyCreate } from "./weekly-create.mjs";
import { validatePublishedPodcastAssets } from "./validate-weekly-assets.mjs";
import { getWeeklyWorkspacePaths } from "./lib/weekly-paths.mjs";

const TEMP_DIRS = [];
const PNG_FIXTURE_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lp4m1wAAAABJRU5ErkJggg==",
  "base64",
);
const MP3_FIXTURE_BYTES = Buffer.from([
  0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x0f, 0x54, 0x45, 0x53, 0x54, 0x00, 0x00,
  0x00, 0x03, 0x00, 0x00, 0x65, 0x32, 0x65,
]);

afterEach(async () => {
  await Promise.all(
    TEMP_DIRS.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function buildExistingCard() {
  return {
    id: "2026-05-21-existing-card",
    cardDate: "2026-05-21",
    title: "已有知识卡",
    subtitle: "旧内容",
    category: "商业金融",
    subCategory: "商业模式",
    difficulty: "入门",
    imageUrl: "/generated-cards/2026-05-21-existing-card.png",
    summary: "用于推导下一周日期。",
    keywords: ["已有"],
    completed: false,
    favorite: false,
    needReview: false,
    content: {
      title: "已有知识卡",
      subtitle: "旧内容",
      category: "商业金融",
      subCategory: "商业模式",
      difficulty: "入门",
      summary: "用于推导下一周日期。",
      coreMechanism: "旧机制。",
      whyImportant: ["旧要点。"],
      keywords: [{ term: "已有", desc: "旧关键词。" }],
      misconception: { title: "旧误区", content: "旧说明。" },
      financeAngle: "旧财务视角。",
      memoryHooks: ["旧钩子。"],
      thinkingQuestions: [
        {
          level: "概念理解",
          question: "旧问题？",
          answer: "旧答案。",
          keyPoint: "旧考点。",
        },
      ],
      conclusion: "旧结论。",
    },
  };
}

async function createFixtureProject() {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "weekly-e2e-test-"));
  TEMP_DIRS.push(projectRoot);
  await mkdir(path.join(projectRoot, "data"), { recursive: true });
  await mkdir(path.join(projectRoot, "public", "generated-cards"), { recursive: true });
  await mkdir(path.join(projectRoot, "public", "audio", "published"), { recursive: true });
  await mkdir(path.join(projectRoot, "public", "transcripts", "published"), { recursive: true });
  await mkdir(path.join(projectRoot, "public", "archive"), { recursive: true });

  await writeJson(path.join(projectRoot, "data", "cards.json"), [buildExistingCard()]);
  await writeJson(path.join(projectRoot, "data", "podcast-manifest.json"), {
    updatedAt: "",
    items: [],
  });
  await writeJson(path.join(projectRoot, "data", "archive-manifest.json"), {
    updatedAt: "",
    items: [],
  });
  await writeFile(
    path.join(projectRoot, "public", "generated-cards", "2026-05-21-existing-card.png"),
    "existing-image",
  );

  return projectRoot;
}

describe("weekly single-card e2e smoke fixture", () => {
  it("runs create, image import, audio import, continue, and repeat without duplicates", async () => {
    const projectRoot = await createFixtureProject();
    const createResult = await runWeeklyCreate({
      projectRoot,
      now: "2026-05-21T09:30:00.000Z",
    });
    const paths = getWeeklyWorkspacePaths(projectRoot, createResult.weekId);
    const fullPlan = await readJson(paths.weeklyPlan);
    expect(fullPlan.cards).toHaveLength(7);
    // This fixture intentionally narrows the generated batch to one card so it can
    // exercise the full pipeline without preparing seven binary assets.
    const oneCardPlan = {
      ...fullPlan,
      cards: [fullPlan.cards[0]],
    };
    await writeJson(paths.weeklyPlan, oneCardPlan);

    const card = oneCardPlan.cards[0];
    await writeFile(path.join(paths.rawImagesDir, `${card.cardId}.png`), PNG_FIXTURE_BYTES);

    const imageResult = await runImportWeeklyImages({
      projectRoot,
      weekId: createResult.weekId,
    });
    expect(imageResult.importedCount).toBe(1);

    const doneDir = path.join(paths.donePodcastDir, card.cardId);
    await mkdir(doneDir, { recursive: true });
    await writeFile(path.join(doneDir, `${card.cardId}-podcast-v1.mp3`), MP3_FIXTURE_BYTES);
    await writeFile(path.join(doneDir, "transcript.md"), "# Transcript\nfixture\n");
    await writeJson(path.join(doneDir, "podcast.meta.json"), {
      cardId: card.cardId,
      podcastVersion: 1,
      title: card.title,
      targetDurationSec: 180,
      duration: 188,
    });

    const audioResult = await runImportPodcastAudio({
      projectRoot,
      weekId: createResult.weekId,
    });
    expect(audioResult.importedCount).toBe(1);

    const continueResult = await runWeeklyContinue({
      projectRoot,
      weekId: createResult.weekId,
      now: "2026-05-21T12:00:00.000Z",
    });
    expect(continueResult.appendedCount).toBe(1);

    const cardsAfterFirstContinue = await readJson(path.join(projectRoot, "data", "cards.json"));
    expect(cardsAfterFirstContinue.filter((item) => item.id === card.cardId)).toHaveLength(1);

    const rerunResult = await runWeeklyContinue({
      projectRoot,
      weekId: createResult.weekId,
      now: "2026-05-22T12:00:00.000Z",
    });
    expect(rerunResult.appendedCount).toBe(0);
    expect(rerunResult.skippedExistingCount).toBe(1);

    const cardsAfterRerun = await readJson(path.join(projectRoot, "data", "cards.json"));
    expect(cardsAfterRerun.filter((item) => item.id === card.cardId)).toHaveLength(1);
    expect(cardsAfterRerun).toHaveLength(2);

    const validation = await validatePublishedPodcastAssets(projectRoot);
    expect(validation.errors).toEqual([]);
    expect(validation.ok).toBe(true);
  });
});
