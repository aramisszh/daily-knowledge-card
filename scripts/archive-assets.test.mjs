import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { archiveAssetsInternals, runArchiveAssets } from "./archive-assets.mjs";

const TEMP_DIRS = [];
const CARD_ID = "2026-05-22-post-station-network";

afterEach(async () => {
  archiveAssetsInternals.writeTextFileAtomically =
    archiveAssetsInternals.defaultWriteTextFileAtomically;
  await Promise.all(
    TEMP_DIRS.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

function checksumFor(buffer) {
  return `sha256-${createHash("sha256").update(buffer).digest("hex")}`;
}

function buildCard({ version = 1, status = "published" } = {}) {
  return {
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
      status,
      version,
      title: "驿站网络为什么能加快信息传递",
      duration: 188,
      audioUrl: `/audio/published/${CARD_ID}-podcast-v${version}.mp3`,
      transcriptUrl: `/transcripts/published/${CARD_ID}-podcast-v${version}.md`,
      sizeBytes: 11,
      checksum: "sha256-source",
      archivedVersions: version > 1 ? [{ version: 1, status: "archived" }] : [],
    },
    content: {
      title: "驿站网络为什么能加快信息传递",
      subtitle: "分段接力如何缩短长距离通信时间",
      category: "历史文明",
      subCategory: "基础设施",
      difficulty: "入门",
      summary: "把长途通信拆成标准化节点接力。",
      coreMechanism: "固定节点换马换人。",
      whyImportant: ["传递更快。"],
      keywords: [{ term: "驿站", desc: "中转节点。" }],
      misconception: { title: "常见误区", content: "不是单匹马更快。" },
      financeAngle: "节点管理提升效率。",
      memoryHooks: ["高速服务区。"],
      thinkingQuestions: [
        {
          level: "概念理解",
          question: "为什么接力更快？",
          answer: "每段保持更好状态。",
          keyPoint: "系统效率。",
        },
      ],
      conclusion: "长链路变成接力系统。",
    },
  };
}

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function createFixtureProject({ version = 1, archiveItems = [] } = {}) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "archive-assets-test-"));
  TEMP_DIRS.push(projectRoot);

  const dataDir = path.join(projectRoot, "data");
  const audioDir = path.join(projectRoot, "public", "audio", "published");
  const transcriptDir = path.join(projectRoot, "public", "transcripts", "published");
  const archiveAudioDir = path.join(projectRoot, "public", "archive", "audio");
  const archiveTranscriptDir = path.join(projectRoot, "public", "archive", "transcripts");
  await mkdir(dataDir, { recursive: true });
  await mkdir(audioDir, { recursive: true });
  await mkdir(transcriptDir, { recursive: true });
  await mkdir(archiveAudioDir, { recursive: true });
  await mkdir(archiveTranscriptDir, { recursive: true });

  const audioBytes = Buffer.from(`audio-v${version}`);
  const transcriptText = `# Transcript v${version}\n`;
  const audioPath = path.join(audioDir, `${CARD_ID}-podcast-v${version}.mp3`);
  const transcriptPath = path.join(transcriptDir, `${CARD_ID}-podcast-v${version}.md`);
  await writeFile(audioPath, audioBytes);
  await writeFile(transcriptPath, transcriptText, "utf8");

  const cardsPath = path.join(dataDir, "cards.json");
  const archiveManifestPath = path.join(dataDir, "archive-manifest.json");
  await writeJson(cardsPath, [buildCard({ version })]);
  await writeJson(archiveManifestPath, {
    updatedAt: "",
    items: archiveItems,
  });

  return {
    projectRoot,
    cardsPath,
    archiveManifestPath,
    audioPath,
    transcriptPath,
    archiveAudioPath: path.join(archiveAudioDir, `${CARD_ID}-podcast-v${version}.mp3`),
    archiveTranscriptPath: path.join(
      archiveTranscriptDir,
      `${CARD_ID}-podcast-v${version}.md`,
    ),
    audioBytes,
    transcriptText,
  };
}

describe("runArchiveAssets", () => {
  it("archives podcast assets by copying without deleting sources", async () => {
    const {
      projectRoot,
      archiveManifestPath,
      audioPath,
      transcriptPath,
      archiveAudioPath,
      archiveTranscriptPath,
      audioBytes,
      transcriptText,
    } = await createFixtureProject();

    const result = await runArchiveAssets({
      projectRoot,
      type: "podcast",
      cardId: CARD_ID,
      version: 1,
      reason: "新版本发布",
      now: "2026-05-22T08:00:00.000Z",
    });

    expect(result).toMatchObject({
      cardId: CARD_ID,
      version: 1,
      archivedCount: 2,
      withdrawn: false,
    });
    expect(await readFile(audioPath)).toEqual(audioBytes);
    expect(await readFile(transcriptPath, "utf8")).toBe(transcriptText);
    expect(await readFile(archiveAudioPath)).toEqual(audioBytes);
    expect(await readFile(archiveTranscriptPath, "utf8")).toBe(transcriptText);

    const manifest = await readJson(archiveManifestPath);
    expect(manifest.updatedAt).toBe("2026-05-22T08:00:00.000Z");
    expect(manifest.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cardId: CARD_ID,
          assetType: "podcast-audio",
          version: 1,
          sourceUrl: `/audio/published/${CARD_ID}-podcast-v1.mp3`,
          archiveUrl: `/archive/audio/${CARD_ID}-podcast-v1.mp3`,
          checksum: checksumFor(audioBytes),
        }),
        expect.objectContaining({
          cardId: CARD_ID,
          assetType: "podcast-transcript",
          version: 1,
          archiveUrl: `/archive/transcripts/${CARD_ID}-podcast-v1.md`,
          checksum: checksumFor(Buffer.from(transcriptText, "utf8")),
        }),
      ]),
    );
  });

  it("refuses to overwrite an existing archive file with different bytes", async () => {
    const { projectRoot, archiveManifestPath, archiveAudioPath } = await createFixtureProject();
    await writeFile(archiveAudioPath, Buffer.from("different"));
    const manifestTextBefore = await readFile(archiveManifestPath, "utf8");

    await expect(
      runArchiveAssets({
        projectRoot,
        type: "podcast",
        cardId: CARD_ID,
        version: 1,
        reason: "新版本发布",
      }),
    ).rejects.toThrow("different bytes");

    expect(await readFile(archiveAudioPath)).toEqual(Buffer.from("different"));
    expect(await readFile(archiveManifestPath, "utf8")).toBe(manifestTextBefore);
  });

  it("does not duplicate archive manifest entries on rerun with same archive urls", async () => {
    const { projectRoot, archiveManifestPath } = await createFixtureProject();

    await runArchiveAssets({
      projectRoot,
      type: "podcast",
      cardId: CARD_ID,
      version: 1,
      reason: "新版本发布",
      now: "2026-05-22T08:00:00.000Z",
    });
    const manifestTextAfterFirstRun = await readFile(archiveManifestPath, "utf8");

    await runArchiveAssets({
      projectRoot,
      type: "podcast",
      cardId: CARD_ID,
      version: 1,
      reason: "新版本发布",
      now: "2026-05-22T09:00:00.000Z",
    });

    expect(await readFile(archiveManifestPath, "utf8")).toBe(manifestTextAfterFirstRun);
  });

  it("rejects conflicting archive manifest entries for the same card type and version", async () => {
    const { projectRoot, archiveManifestPath } = await createFixtureProject({
      archiveItems: [
        {
          cardId: CARD_ID,
          assetType: "podcast-audio",
          status: "archived",
          version: 1,
          sourceUrl: `/audio/published/${CARD_ID}-podcast-v1.wav`,
          archiveUrl: `/archive/audio/${CARD_ID}-podcast-v1.wav`,
          reason: "旧格式",
          archivedAt: "2026-05-22T07:00:00.000Z",
          sizeBytes: 1,
          checksum: "sha256-existing",
        },
      ],
    });
    const manifestTextBefore = await readFile(archiveManifestPath, "utf8");

    await expect(
      runArchiveAssets({
        projectRoot,
        type: "podcast",
        cardId: CARD_ID,
        version: 1,
        reason: "新版本发布",
      }),
    ).rejects.toThrow("Conflicting archive manifest entry");

    expect(await readFile(archiveManifestPath, "utf8")).toBe(manifestTextBefore);
  });

  it("marks podcast as withdrawn only after archive manifest write succeeds", async () => {
    const { projectRoot, cardsPath, archiveManifestPath } = await createFixtureProject();

    await runArchiveAssets({
      projectRoot,
      withdraw: true,
      cardId: CARD_ID,
      reason: "内容修订",
      now: "2026-05-22T08:00:00.000Z",
    });

    const cards = await readJson(cardsPath);
    expect(cards[0].podcast).toMatchObject({
      status: "withdrawn",
      withdrawnAt: "2026-05-22T08:00:00.000Z",
      withdrawReason: "内容修订",
    });
    expect(cards[0].podcast.archivedVersions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          version: 1,
          status: "archived",
          reason: "内容修订",
        }),
      ]),
    );

    const manifest = await readJson(archiveManifestPath);
    expect(manifest.items).toHaveLength(2);
  });

  it("restores archive manifest if withdrawn card write fails", async () => {
    const { projectRoot, cardsPath, archiveManifestPath } = await createFixtureProject();
    const cardsTextBefore = await readFile(cardsPath, "utf8");
    const manifestTextBefore = await readFile(archiveManifestPath, "utf8");
    const originalWriter = archiveAssetsInternals.writeTextFileAtomically;
    let manifestWriteCount = 0;

    archiveAssetsInternals.writeTextFileAtomically = async (filePath, text) => {
      if (filePath === archiveManifestPath) {
        manifestWriteCount += 1;
        return originalWriter(filePath, text);
      }
      if (filePath === cardsPath) {
        throw new Error("Injected cards write failure");
      }
      return originalWriter(filePath, text);
    };

    await expect(
      runArchiveAssets({
        projectRoot,
        withdraw: true,
        cardId: CARD_ID,
        reason: "内容修订",
      }),
    ).rejects.toThrow("Injected cards write failure");

    expect(manifestWriteCount).toBe(2);
    expect(await readFile(cardsPath, "utf8")).toBe(cardsTextBefore);
    expect(await readFile(archiveManifestPath, "utf8")).toBe(manifestTextBefore);
  });

  it("keeps a rollback as a new published version instead of decrementing version", async () => {
    const { projectRoot, cardsPath, archiveManifestPath } = await createFixtureProject({
      version: 2,
    });

    const result = await runArchiveAssets({
      projectRoot,
      type: "podcast",
      cardId: CARD_ID,
      version: 2,
      reason: "归档旧版本",
    });

    expect(result.version).toBe(2);
    const cards = await readJson(cardsPath);
    expect(cards[0].podcast.version).toBe(2);
    expect(cards[0].podcast.status).toBe("published");
    expect(cards[0].podcast.archivedVersions).toEqual([
      { version: 1, status: "archived" },
    ]);

    const manifest = await readJson(archiveManifestPath);
    expect(manifest.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cardId: CARD_ID,
          assetType: "podcast-audio",
          version: 2,
        }),
      ]),
    );
  });
});

describe("archive-assets CLI", () => {
  it("archives podcast assets from CLI args", async () => {
    const { projectRoot } = await createFixtureProject();
    const scriptPath = path.resolve("scripts/archive-assets.mjs");

    const result = spawnSync(
      process.execPath,
      [
        scriptPath,
        "--type",
        "podcast",
        "--cardId",
        CARD_ID,
        "--version",
        "1",
        "--reason",
        "新版本发布",
      ],
      {
        cwd: projectRoot,
        encoding: "utf8",
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Archived 2 assets");
  });

  it("rejects unknown CLI flags instead of silently defaulting version", async () => {
    const { projectRoot } = await createFixtureProject();
    const scriptPath = path.resolve("scripts/archive-assets.mjs");

    const result = spawnSync(
      process.execPath,
      [
        scriptPath,
        "--type",
        "podcast",
        "--cardId",
        CARD_ID,
        "--verison",
        "1",
        "--reason",
        "新版本发布",
      ],
      {
        cwd: projectRoot,
        encoding: "utf8",
      },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Unknown argument: --verison");
  });
});
