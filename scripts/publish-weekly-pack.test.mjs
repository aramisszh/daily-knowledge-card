import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runPublishWeeklyPack } from "./publish-weekly-pack.mjs";
import { runReceiveWeeklyPack } from "./receive-weekly-pack.mjs";

const TEMP_DIRS = [];
const WEEK_KEY = "2026-W23";
const CARD_ID = "2026-06-01-qr-code-error-correction";
const ZIP_NAME = "dkc-handoff__2026-W23__2026-06-01_to_2026-06-07.zip";

afterEach(async () => {
  await Promise.all(TEMP_DIRS.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function zipDirectory(sourceDir, zipPath) {
  const result = spawnSync("zip", ["-qr", zipPath, "."], {
    cwd: sourceDir,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "zip command failed");
  }
}

async function createSourcePackageDir(baseDir) {
  const packageDir = path.join(baseDir, "package-root");
  const doneDir = path.join(packageDir, "podcast_jobs", "done", CARD_ID);
  const imageDir = path.join(packageDir, "images", "raw");

  await mkdir(doneDir, { recursive: true });
  await mkdir(imageDir, { recursive: true });

  await writeJson(path.join(packageDir, "weekly-plan.json"), {
    weekId: WEEK_KEY,
    weekStart: "2026-06-01",
    weekEnd: "2026-06-07",
    cardCount: 1,
    cards: [
      {
        date: "2026-06-01",
        cardId: CARD_ID,
        title: "二维码被弄脏，为什么还能扫出来？",
        category: "信息技术",
        imageFile: `images/raw/${CARD_ID}.png`,
        audioTargetFileName: `${CARD_ID}-podcast-v1.mp3`,
      },
    ],
  });

  await writeJson(path.join(packageDir, "cards-draft.json"), {
    schemaVersion: "daily-knowledge-card.cards-draft.v1",
    weekId: WEEK_KEY,
    items: [
      {
        date: "2026-06-01",
        cardId: CARD_ID,
        title: "二维码被弄脏，为什么还能扫出来？",
        subtitle: "关键不只是黑白方块，而是纠错编码在偷偷兜底",
        category: "信息技术",
        summary: "二维码不仅存了内容，还额外存了纠错信息，所以局部污损时仍可恢复数据。",
        oneSentence: "二维码会利用冗余纠错信息恢复局部损坏的数据。",
        coreConcepts: ["定位图形", "静区", "纠错冗余"],
        contentBlocks: [
          {
            heading: "为什么还能扫",
            body: "只要损坏范围没有超过纠错能力，系统就能推回缺失数据。",
          },
        ],
        thoughtQuestions: [
          {
            question: "Logo 放在二维码中间为什么有时也能扫？",
            answer: "因为遮挡没有超过当前纠错等级可容忍的范围。",
          },
        ],
        podcastAngle: "从生活里的脏二维码切入解释纠错机制。",
        image: {
          fileName: `${CARD_ID}.png`,
          path: `images/raw/${CARD_ID}.png`,
        },
      },
    ],
  });

  await writeJson(path.join(packageDir, "package-manifest.json"), {
    schemaVersion: "daily-knowledge-card.package-manifest.v1",
    weekId: WEEK_KEY,
  });

  await writeJson(path.join(packageDir, "windows-audio-report.json"), {
    weekId: WEEK_KEY,
    successCount: 1,
  });

  await writeFile(path.join(imageDir, `${CARD_ID}.png`), "image");
  await writeFile(path.join(doneDir, `${CARD_ID}-podcast-v1.mp3`), "audio");
  await writeFile(path.join(doneDir, "transcript.md"), "# Transcript\n", "utf8");
  await writeFile(path.join(doneDir, "script.md"), "# Script\n", "utf8");
  await writeFile(path.join(doneDir, "script.srt"), "1\n00:00:00,000 --> 00:00:10,000\nA：你好\n", "utf8");
  await writeJson(path.join(doneDir, "podcast.meta.json"), {
    cardId: CARD_ID,
    podcastVersion: 1,
    title: "二维码被弄脏，为什么还能扫出来？",
    targetDurationSec: 180,
    duration: 123,
  });

  return packageDir;
}

async function createFixture() {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "publish-weekly-pack-test-"));
  TEMP_DIRS.push(projectRoot);

  const inboxDir = path.join(projectRoot, "automation", "exchange", "inbox");
  const dataDir = path.join(projectRoot, "data");
  const publicCardsDir = path.join(projectRoot, "public", "generated-cards");
  const publicAudioDir = path.join(projectRoot, "public", "audio", "published");
  const publicTranscriptDir = path.join(projectRoot, "public", "transcripts", "published");
  const publicArchiveDir = path.join(projectRoot, "public", "archive");

  await mkdir(inboxDir, { recursive: true });
  await mkdir(dataDir, { recursive: true });
  await mkdir(publicCardsDir, { recursive: true });
  await mkdir(publicAudioDir, { recursive: true });
  await mkdir(publicTranscriptDir, { recursive: true });
  await mkdir(publicArchiveDir, { recursive: true });

  const packageDir = await createSourcePackageDir(projectRoot);
  await zipDirectory(packageDir, path.join(inboxDir, ZIP_NAME));

  await writeJson(path.join(dataDir, "cards.json"), [
    {
      id: "2026-05-31-existing-card",
      title: "已有卡",
      subtitle: "旧副标题",
      category: "历史文明",
      subCategory: "制度",
      difficulty: "入门",
      cardDate: "2026-05-31",
      imageUrl: "/generated-cards/2026-05-31-existing-card.png",
      summary: "旧摘要",
      keywords: ["旧"],
      completed: false,
      favorite: false,
      needReview: false,
      content: {
        title: "已有卡",
        subtitle: "旧副标题",
        category: "历史文明",
        subCategory: "制度",
        difficulty: "入门",
        summary: "旧摘要",
        coreMechanism: "旧机制",
        whyImportant: ["旧要点"],
        keywords: [{ term: "旧", desc: "旧词" }],
        misconception: { title: "旧误区", content: "旧误区说明" },
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
      userLocalField: "preserve-me",
    },
  ]);
  await writeJson(path.join(dataDir, "podcast-manifest.json"), {
    updatedAt: "2026-05-22T00:00:00.000Z",
    items: [],
  });
  await writeJson(path.join(dataDir, "archive-manifest.json"), {
    updatedAt: "2026-05-22T00:00:00.000Z",
    items: [],
  });

  return {
    projectRoot,
    cardsPath: path.join(dataDir, "cards.json"),
    manifestPath: path.join(dataDir, "podcast-manifest.json"),
    reportPath: path.join(projectRoot, "automation", "weekly", WEEK_KEY, "reports", "mac-import-report.md"),
  };
}

describe("runPublishWeeklyPack", () => {
  it("throws when weekKey is missing", async () => {
    await expect(runPublishWeeklyPack()).rejects.toThrow("weekKey is required");
  });

  it("publishes a received exchange pack into public assets, cards, manifest, and report", async () => {
    const { projectRoot, cardsPath, manifestPath, reportPath } = await createFixture();
    await runReceiveWeeklyPack({ projectRoot, weekKey: WEEK_KEY });

    const result = await runPublishWeeklyPack({ projectRoot, weekKey: WEEK_KEY });

    expect(result.weekKey).toBe(WEEK_KEY);
    expect(result.appendedCount).toBe(1);

    const cards = await readJson(cardsPath);
    expect(cards).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: CARD_ID,
          title: "二维码被弄脏，为什么还能扫出来？",
          imageUrl: `/generated-cards/${CARD_ID}.png`,
          podcast: expect.objectContaining({
            status: "published",
            audioUrl: `/audio/published/${CARD_ID}-podcast-v1.mp3`,
            transcriptUrl: `/transcripts/published/${CARD_ID}-podcast-v1.md`,
          }),
        }),
        expect.objectContaining({
          id: "2026-05-31-existing-card",
          userLocalField: "preserve-me",
        }),
      ]),
    );

    const manifest = await readJson(manifestPath);
    expect(manifest.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cardId: CARD_ID,
          status: "published",
          version: 1,
        }),
      ]),
    );

    expect(
      await readFile(
        path.join(projectRoot, "public", "generated-cards", `${CARD_ID}.png`),
        "utf8",
      ),
    ).toBe("image");
    expect(
      await readFile(
        path.join(projectRoot, "public", "audio", "published", `${CARD_ID}-podcast-v1.mp3`),
        "utf8",
      ),
    ).toBe("audio");
    expect(
      await readFile(
        path.join(projectRoot, "public", "transcripts", "published", `${CARD_ID}-podcast-v1.md`),
        "utf8",
      ),
    ).toBe("# Transcript\n");

    const reportText = await readFile(reportPath, "utf8");
    expect(reportText).toContain(`weekKey: ${WEEK_KEY}`);
    expect(reportText).toContain(`appendedCount: 1`);
  });
});
