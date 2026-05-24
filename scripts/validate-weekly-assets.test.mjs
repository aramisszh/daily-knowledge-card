import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { validatePublishedPodcastAssets } from "./validate-weekly-assets.mjs";

const TEMP_DIRS = [];
const CARD_ID = "2026-05-22-post-station-network";

afterEach(async () => {
  await Promise.all(
    TEMP_DIRS.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

function buildCard(overrides = {}) {
  return {
    id: CARD_ID,
    title: "驿站网络为什么能加快信息传递",
    subtitle: "分段接力如何缩短长距离通信时间",
    category: "历史文明",
    subCategory: "基础设施",
    difficulty: "入门",
    cardDate: "2026-05-22",
    imageUrl: `/generated-cards/${CARD_ID}.png`,
    summary: "把长途通信拆成标准化节点接力，速度和可靠性都会提升。",
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
    ...overrides,
  };
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function createFixtureProject({ card = buildCard(), manifestItem, archiveItems = [] } = {}) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "validate-weekly-assets-test-"));
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
  await mkdir(path.join(archiveDir, "audio"), { recursive: true });
  await mkdir(path.join(archiveDir, "transcripts"), { recursive: true });

  await writeFile(path.join(generatedCardsDir, `${CARD_ID}.png`), "image");
  await writeFile(path.join(audioDir, `${CARD_ID}-podcast-v1.mp3`), "audio");
  await writeFile(path.join(transcriptDir, `${CARD_ID}-podcast-v1.md`), "# Transcript\n");

  const defaultManifestItem = {
    cardId: CARD_ID,
    status: "published",
    version: 1,
    title: "驿站网络为什么能加快信息传递",
    audioUrl: `/audio/published/${CARD_ID}-podcast-v1.mp3`,
    transcriptUrl: `/transcripts/published/${CARD_ID}-podcast-v1.md`,
    duration: 188,
    sizeBytes: 11,
    checksum: "sha256-audio",
  };

  await writeJson(path.join(dataDir, "cards.json"), [card]);
  await writeJson(path.join(dataDir, "podcast-manifest.json"), {
    updatedAt: "2026-05-22T08:00:00.000Z",
    items: [manifestItem ?? defaultManifestItem],
  });
  await writeJson(path.join(dataDir, "archive-manifest.json"), {
    updatedAt: "",
    items: archiveItems,
  });

  return {
    projectRoot,
    imagePath: path.join(generatedCardsDir, `${CARD_ID}.png`),
    audioPath: path.join(audioDir, `${CARD_ID}-podcast-v1.mp3`),
    transcriptPath: path.join(transcriptDir, `${CARD_ID}-podcast-v1.md`),
  };
}

describe("validatePublishedPodcastAssets", () => {
  it("passes when cards, podcast manifest, and assets are aligned", async () => {
    const { projectRoot } = await createFixtureProject();

    const summary = await validatePublishedPodcastAssets(projectRoot);

    expect(summary.ok).toBe(true);
    expect(summary.errors).toEqual([]);
  });

  it("reports every imageUrl missing from data/cards.json", async () => {
    const { projectRoot, imagePath } = await createFixtureProject();
    await unlink(imagePath);

    const summary = await validatePublishedPodcastAssets(projectRoot);

    expect(summary.ok).toBe(false);
    expect(summary.errors.join("\n")).toContain(`Card ${CARD_ID} imageUrl missing`);
    expect(summary.errors.join("\n")).toContain(imagePath);
  });

  it("reports missing published podcast audio and transcript files", async () => {
    const { projectRoot, audioPath, transcriptPath } = await createFixtureProject();
    await unlink(audioPath);
    await unlink(transcriptPath);

    const summary = await validatePublishedPodcastAssets(projectRoot);

    expect(summary.ok).toBe(false);
    expect(summary.errors.join("\n")).toContain(`Card ${CARD_ID} podcast audioUrl missing`);
    expect(summary.errors.join("\n")).toContain(audioPath);
    expect(summary.errors.join("\n")).toContain(`Card ${CARD_ID} podcast transcriptUrl missing`);
    expect(summary.errors.join("\n")).toContain(transcriptPath);
  });

  it("fails if a published transcript still contains control or speaker tags", async () => {
    const { projectRoot, transcriptPath } = await createFixtureProject();
    await writeFile(transcriptPath, "[ctrl] cue\n[spk1] hello\n", "utf8");

    const summary = await validatePublishedPodcastAssets(projectRoot);

    expect(summary.ok).toBe(false);
    expect(summary.errors.join("\n")).toContain("contains forbidden TTS tags");
    expect(summary.errors.join("\n")).toContain(transcriptPath);
  });

  it("reports podcast manifest mismatch for published podcasts", async () => {
    const { projectRoot } = await createFixtureProject({
      manifestItem: {
        cardId: CARD_ID,
        status: "published",
        version: 1,
        title: "错误标题",
        audioUrl: "/audio/published/wrong.mp3",
        transcriptUrl: `/transcripts/published/${CARD_ID}-podcast-v1.md`,
        duration: 1,
        sizeBytes: 1,
        checksum: "sha256-wrong",
      },
    });

    const summary = await validatePublishedPodcastAssets(projectRoot);

    expect(summary.ok).toBe(false);
    expect(summary.errors.join("\n")).toContain("Podcast manifest mismatch");
    expect(summary.errors.join("\n")).toContain("data/podcast-manifest.json.items");
    expect(summary.errors.join("\n")).toContain("title");
    expect(summary.errors.join("\n")).toContain("duration");
    expect(summary.errors.join("\n")).toContain("sizeBytes");
    expect(summary.errors.join("\n")).toContain("audioUrl");
    expect(summary.errors.join("\n")).toContain("checksum");
  });

  it("reports stale published podcast manifest entries not present in cards", async () => {
    const { projectRoot } = await createFixtureProject({
      manifestItem: {
        cardId: "2026-01-01-stale",
        status: "published",
        version: 1,
        audioUrl: "/audio/published/stale.mp3",
        transcriptUrl: "/transcripts/published/stale.md",
        checksum: "sha256-stale",
      },
    });

    const summary = await validatePublishedPodcastAssets(projectRoot);

    expect(summary.ok).toBe(false);
    expect(summary.errors.join("\n")).toContain("stale published item");
    expect(summary.errors.join("\n")).toContain("data/podcast-manifest.json.items");
  });

  it("fails if Chinese-heavy cards contain literal question marks", async () => {
    const { projectRoot } = await createFixtureProject({
      card: buildCard({
        title: "驿站网络为什么能加快信息传递??",
      }),
    });

    const summary = await validatePublishedPodcastAssets(projectRoot);

    expect(summary.ok).toBe(false);
    expect(summary.errors.join("\n")).toContain("suspicious text");
    expect(summary.errors.join("\n")).toContain(`data/cards.json[id=${CARD_ID}].title`);
  });

  it("fails if a Chinese-heavy field fully degrades to question marks", async () => {
    const { projectRoot } = await createFixtureProject({
      card: buildCard({
        title: "????",
      }),
    });

    const summary = await validatePublishedPodcastAssets(projectRoot);

    expect(summary.ok).toBe(false);
    expect(summary.errors.join("\n")).toContain("suspicious text");
    expect(summary.errors.join("\n")).toContain(`data/cards.json[id=${CARD_ID}].title`);
  });

  it("does not fail on a legitimate single question mark", async () => {
    const { projectRoot } = await createFixtureProject({
      card: buildCard({
        title: "Why does this matter?",
      }),
    });

    const summary = await validatePublishedPodcastAssets(projectRoot);

    expect(summary.ok).toBe(true);
  });

  it("fails if withdrawn podcast still exposes playable references", async () => {
    const { projectRoot } = await createFixtureProject({
      card: buildCard({
        podcast: {
          ...buildCard().podcast,
          status: "withdrawn",
        },
      }),
      manifestItem: {
        cardId: "unrelated",
        status: "published",
        version: 1,
        audioUrl: "/audio/published/unrelated.mp3",
        transcriptUrl: "/transcripts/published/unrelated.md",
        checksum: "sha256-unrelated",
      },
    });

    const summary = await validatePublishedPodcastAssets(projectRoot);

    expect(summary.ok).toBe(false);
    expect(summary.errors.join("\n")).toContain("withdrawn podcast must not expose audioUrl");
    expect(summary.errors.join("\n")).toContain("withdrawn podcast must not expose transcriptUrl");
    expect(summary.errors.join("\n")).toContain("withdrawn podcast must not expose checksum");
  });

  it("reports missing archive manifest files", async () => {
    const archiveUrl = `/archive/audio/${CARD_ID}-podcast-v1.mp3`;
    const { projectRoot } = await createFixtureProject({
      archiveItems: [
        {
          cardId: CARD_ID,
          assetType: "podcast-audio",
          version: 1,
          archiveUrl,
        },
      ],
    });

    const summary = await validatePublishedPodcastAssets(projectRoot);

    expect(summary.ok).toBe(false);
    expect(summary.errors.join("\n")).toContain(`Archive ${CARD_ID} podcast-audio missing`);
  });
});

describe("weekly:validate CLI", () => {
  it("prints all validation errors and exits nonzero", async () => {
    const { projectRoot, audioPath, transcriptPath } = await createFixtureProject();
    await unlink(audioPath);
    await unlink(transcriptPath);
    const scriptPath = path.resolve("scripts/validate-weekly-assets.mjs");

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: projectRoot,
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("ERROR");
    expect(result.stderr).toContain(audioPath);
    expect(result.stderr).toContain(transcriptPath);
  });
});
