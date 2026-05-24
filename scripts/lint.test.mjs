import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { runLintChecks } from "./lint.mjs";

const TEMP_DIRS = [];
const CARD_ID = "2026-05-22-post-station-network";

afterEach(async () => {
  await Promise.all(TEMP_DIRS.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createFixtureProject({ transcriptText = "# Transcript\nClean\n", publicPaddingBytes = 0 } = {}) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "lint-script-test-"));
  TEMP_DIRS.push(projectRoot);

  const dataDir = path.join(projectRoot, "data");
  const generatedCardsDir = path.join(projectRoot, "public", "generated-cards");
  const audioDir = path.join(projectRoot, "public", "audio", "published");
  const transcriptDir = path.join(projectRoot, "public", "transcripts", "published");
  const archiveDir = path.join(projectRoot, "public", "archive");

  await mkdir(dataDir, { recursive: true });
  await mkdir(generatedCardsDir, { recursive: true });
  await mkdir(audioDir, { recursive: true });
  await mkdir(transcriptDir, { recursive: true });
  await mkdir(archiveDir, { recursive: true });

  await writeFile(path.join(generatedCardsDir, `${CARD_ID}.png`), "image");
  await writeFile(path.join(audioDir, `${CARD_ID}-podcast-v1.mp3`), "audio");
  await writeFile(path.join(transcriptDir, `${CARD_ID}-podcast-v1.md`), transcriptText, "utf8");
  if (publicPaddingBytes > 0) {
    await writeFile(path.join(generatedCardsDir, "padding.bin"), Buffer.alloc(publicPaddingBytes));
  }

  await writeJson(path.join(dataDir, "cards.json"), [
    {
      id: CARD_ID,
      title: "驿站网络为什么能加快信息传递",
      subtitle: "分段接力如何缩短长距离通信时间",
      category: "历史文明",
      subCategory: "基础设施",
      difficulty: "入门",
      cardDate: "2026-05-22",
      imageUrl: `/generated-cards/${CARD_ID}.png`,
      summary: "把长途通信拆成标准化节点接力。",
      keywords: ["驿站"],
      completed: false,
      favorite: false,
      needReview: false,
      podcast: {
        status: "published",
        version: 1,
        title: "驿站网络为什么能加快信息传递",
        audioUrl: `/audio/published/${CARD_ID}-podcast-v1.mp3`,
        transcriptUrl: `/transcripts/published/${CARD_ID}-podcast-v1.md`,
        duration: 188,
        sizeBytes: 11,
        checksum: "sha256-audio",
      },
      content: {},
    },
  ]);
  await writeJson(path.join(dataDir, "podcast-manifest.json"), {
    updatedAt: "",
    items: [
      {
        cardId: CARD_ID,
        status: "published",
        version: 1,
        title: "驿站网络为什么能加快信息传递",
        audioUrl: `/audio/published/${CARD_ID}-podcast-v1.mp3`,
        transcriptUrl: `/transcripts/published/${CARD_ID}-podcast-v1.md`,
        duration: 188,
        sizeBytes: 11,
        checksum: "sha256-audio",
      },
    ],
  });
  await writeJson(path.join(dataDir, "archive-manifest.json"), {
    updatedAt: "",
    items: [],
  });

  return projectRoot;
}

describe("runLintChecks", () => {
  it("passes on a clean published dataset", async () => {
    const projectRoot = await createFixtureProject();

    const result = await runLintChecks(projectRoot);

    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("fails when published transcripts still contain TTS tags", async () => {
    const projectRoot = await createFixtureProject({
      transcriptText: "# Transcript\n[spk1] hello\n",
    });

    const result = await runLintChecks(projectRoot);

    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain("contains forbidden TTS tags");
  });

  it("returns a warning when public capacity crosses the warning threshold", async () => {
    const projectRoot = await createFixtureProject({
      publicPaddingBytes: 81 * 1024 * 1024,
    });

    const result = await runLintChecks(projectRoot);

    expect(result.ok).toBe(true);
    expect(result.warnings.join("\n")).toContain("Site capacity warning");
  });
});
