import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

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
    includedDates: ["2026-06-01"],
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
    testMode: true,
    items: [
      {
        date: "2026-06-01",
        cardId: CARD_ID,
        title: "二维码被弄脏，为什么还能扫出来？",
        subtitle: "关键不只是黑白方块，而是纠错编码在偷偷兜底",
        category: "信息技术",
        summary: "二维码会存储冗余纠错信息，所以局部污损时仍可恢复部分数据。",
        oneSentence: "二维码不是单纯看图，而是在解码时利用纠错冗余恢复丢失的数据。",
        coreConcepts: [
          "定位图形",
          "静区",
          "Reed-Solomon 纠错",
        ],
        contentBlocks: [
          {
            heading: "为什么还能扫",
            body: "局部污损没有超出纠错能力时，解码器可以恢复缺失的数据。",
          },
        ],
        thoughtQuestions: [
          {
            question: "二维码纠错等级越高越好吗？",
            answer: "不一定，纠错冗余越多，图案通常越密，对尺寸和清晰度要求更高。",
          },
        ],
        podcastAngle: "从生活里的脏二维码切入，解释纠错编码如何兜底。",
        image: {
          fileName: `${CARD_ID}.png`,
          path: `images/raw/${CARD_ID}.png`,
          source: "chatgpt-image2",
          status: "generated",
        },
      },
    ],
  });

  await writeJson(path.join(packageDir, "package-manifest.json"), {
    schemaVersion: "daily-knowledge-card.package-manifest.v1",
    weekId: WEEK_KEY,
    packageRole: "windows-handoff",
  });

  await writeJson(path.join(packageDir, "windows-audio-report.json"), {
    weekId: WEEK_KEY,
    totalTasks: 1,
    successCount: 1,
  });

  await writeFile(path.join(imageDir, `${CARD_ID}.png`), "image");
  await writeFile(path.join(doneDir, `${CARD_ID}-podcast-v1.mp3`), "audio");
  await writeFile(path.join(doneDir, "transcript.md"), "# Transcript\n", "utf8");
  await writeFile(path.join(doneDir, "script.md"), "# Script\n", "utf8");
  await writeFile(path.join(doneDir, "script.srt"), "1\n00:00:00,000 --> 00:00:10,000\nA：你好\n", "utf8");
  await writeJson(path.join(doneDir, "podcast.meta.json"), {
    cardId: CARD_ID,
    weekId: WEEK_KEY,
    podcastVersion: 1,
    title: "二维码被弄脏，为什么还能扫出来？",
    targetDurationSec: 180,
    duration: 176.16,
  });

  return packageDir;
}

async function createFixture() {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "receive-weekly-pack-test-"));
  TEMP_DIRS.push(projectRoot);

  const inboxDir = path.join(projectRoot, "automation", "exchange", "inbox");
  await mkdir(inboxDir, { recursive: true });

  const packageDir = await createSourcePackageDir(projectRoot);
  const zipPath = path.join(inboxDir, ZIP_NAME);
  await zipDirectory(packageDir, zipPath);

  return {
    projectRoot,
    zipPath,
  };
}

describe("runReceiveWeeklyPack", () => {
  it("throws when weekKey is missing", async () => {
    await expect(runReceiveWeeklyPack()).rejects.toThrow("weekKey is required");
  });

  it("receives a zip pack into staging and normalizes source files into automation/weekly", async () => {
    const { projectRoot, zipPath } = await createFixture();

    const result = await runReceiveWeeklyPack({ projectRoot, weekKey: WEEK_KEY });

    expect(result.weekKey).toBe(WEEK_KEY);
    expect(result.cardCount).toBe(1);

    const normalizedPlan = await readJson(
      path.join(projectRoot, "automation", "weekly", WEEK_KEY, "source", "weekly-plan.json"),
    );
    expect(normalizedPlan.workflowMode).toBe("exchange-handoff");
    expect(normalizedPlan.weekKey).toBe(WEEK_KEY);
    expect(normalizedPlan.cards[0]).toMatchObject({
      cardId: CARD_ID,
      cardDate: "2026-06-01",
      title: "二维码被弄脏，为什么还能扫出来？",
      image: {
        sourceFileName: `${CARD_ID}.png`,
        status: "pending",
      },
      podcast: {
        status: "ready",
        version: 1,
      },
      content: {
        coreMechanism: "二维码不是单纯看图，而是在解码时利用纠错冗余恢复丢失的数据。",
      },
    });

    expect(
      await readJson(
        path.join(projectRoot, "automation", "weekly", WEEK_KEY, "outbox", "tts-output-report.json"),
      ),
    ).toMatchObject({
      weekId: WEEK_KEY,
      successCount: 1,
    });

    const stagedImageStats = await stat(
      path.join(
        projectRoot,
        "automation",
        "exchange",
        "staging",
        WEEK_KEY,
        "images",
        "raw",
        `${CARD_ID}.png`,
      ),
    );
    expect(stagedImageStats.isFile()).toBe(true);

    const processedEntries = await readdir(
      path.join(projectRoot, "automation", "exchange", "processed"),
    );
    expect(processedEntries).toContain(ZIP_NAME);
    await expect(stat(zipPath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("moves the zip to failed when required assets are missing", async () => {
    const { projectRoot } = await createFixture();
    const inboxDir = path.join(projectRoot, "automation", "exchange", "inbox");
    await rm(path.join(inboxDir, ZIP_NAME));

    const brokenPackageDir = await createSourcePackageDir(projectRoot);
    await rm(path.join(brokenPackageDir, "images", "raw", `${CARD_ID}.png`));
    await zipDirectory(brokenPackageDir, path.join(inboxDir, ZIP_NAME));

    await expect(runReceiveWeeklyPack({ projectRoot, weekKey: WEEK_KEY })).rejects.toThrow(
      `Missing image asset for ${CARD_ID}`,
    );

    const failedEntries = await readdir(path.join(projectRoot, "automation", "exchange", "failed"));
    expect(failedEntries).toContain(ZIP_NAME);
  });
});
