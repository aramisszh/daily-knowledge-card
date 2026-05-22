import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  importPodcastAudioInternals,
  runImportPodcastAudio,
} from "./import-podcast-audio.mjs";

const TEMP_DIRS = [];
const WEEK_ID = "2026-05-22_to_2026-05-28";
const CARD_ID = "2026-05-22-post-station-network";
const DEFAULT_VERSION = 2;
const DEFAULT_TITLE = "驿站网络的声音版";

afterEach(async () => {
  importPodcastAudioInternals.afterPrepareOperations =
    importPodcastAudioInternals.defaultAfterPrepareOperations;
  importPodcastAudioInternals.writeTextFileAtomically =
    importPodcastAudioInternals.defaultWriteTextFileAtomically;
  await Promise.all(
    TEMP_DIRS.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

function checksumFor(buffer) {
  return `sha256-${createHash("sha256").update(buffer).digest("hex")}`;
}

async function createFixtureProject({
  cards,
  manifestItems = [],
} = {}) {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "import-podcast-audio-test-"),
  );
  TEMP_DIRS.push(projectRoot);

  const weekDir = path.join(projectRoot, "automation", "weekly", WEEK_ID);
  const donePodcastDir = path.join(weekDir, "podcast_jobs", "done");
  const publicAudioDir = path.join(projectRoot, "public", "audio", "published");
  const publicTranscriptDir = path.join(
    projectRoot,
    "public",
    "transcripts",
    "published",
  );
  const dataDir = path.join(projectRoot, "data");

  await mkdir(donePodcastDir, { recursive: true });
  await mkdir(publicAudioDir, { recursive: true });
  await mkdir(publicTranscriptDir, { recursive: true });
  await mkdir(dataDir, { recursive: true });

  const weeklyPlanPath = path.join(weekDir, "weekly-plan.json");
  const manifestPath = path.join(dataDir, "podcast-manifest.json");
  const defaultCards = cards ?? [buildPlanCard()];

  const weeklyPlan = {
    weekId: WEEK_ID,
    createdAt: "2026-05-21T09:30:00.000Z",
    updatedAt: "2026-05-21T09:30:00.000Z",
    status: "created",
    cards: defaultCards,
    preservedTopLevel: {
      note: "keep",
    },
  };

  const manifest = {
    updatedAt: "2026-05-21T09:30:00.000Z",
    items: manifestItems,
  };

  await writeFile(weeklyPlanPath, `${JSON.stringify(weeklyPlan, null, 2)}\n`, "utf8");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    projectRoot,
    weekDir,
    donePodcastDir,
    publicAudioDir,
    publicTranscriptDir,
    weeklyPlanPath,
    manifestPath,
  };
}

function buildPlanCard({
  cardId = CARD_ID,
  version = DEFAULT_VERSION,
  title = DEFAULT_TITLE,
  podcastMetaVersion,
  podcastTargetDurationSec = 180,
} = {}) {
  const resolvedVersion = podcastMetaVersion ?? version;
  return {
    cardId,
    title: "驿站网络为什么能加快信息传递",
    podcast: {
      status: "ready",
      version,
      title,
      targetDurationSec: podcastTargetDurationSec,
      audioUrl: null,
      transcriptUrl: null,
      duration: null,
      sizeBytes: null,
      checksum: null,
    },
    meta: {
      podcastVersion: resolvedVersion,
    },
    extraField: {
      keepMe: true,
    },
  };
}

async function createDonePackage(
  donePodcastDir,
  {
    cardId = CARD_ID,
    version = DEFAULT_VERSION,
    metaCardId = cardId,
    metaVersion = version,
    title = DEFAULT_TITLE,
    audioBytes = Buffer.from("podcast-audio"),
    transcriptText = "# Transcript\n",
    metaOverrides = {},
  } = {},
) {
  const packageDir = path.join(donePodcastDir, cardId);
  await mkdir(packageDir, { recursive: true });
  const mp3FileName = `${cardId}-podcast-v${version}.mp3`;

  await writeFile(path.join(packageDir, mp3FileName), audioBytes);
  await writeFile(path.join(packageDir, "transcript.md"), transcriptText, "utf8");
  await writeFile(
    path.join(packageDir, "podcast.meta.json"),
    `${JSON.stringify(
      {
        cardId: metaCardId,
        podcastVersion: metaVersion,
        title,
        ...metaOverrides,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return {
    packageDir,
    mp3FileName,
    audioBytes,
    transcriptText,
  };
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

describe("runImportPodcastAudio", () => {
  it("throws when weekId is missing", async () => {
    await expect(runImportPodcastAudio()).rejects.toThrow("weekId is required");
  });

  it("throws on invalid weekId before touching weekly files", async () => {
    const { projectRoot, weeklyPlanPath, manifestPath } = await createFixtureProject();
    const planTextBefore = await readText(weeklyPlanPath);
    const manifestTextBefore = await readText(manifestPath);

    await expect(
      runImportPodcastAudio({ projectRoot, weekId: "../bad" }),
    ).rejects.toThrow("Invalid weekId");

    expect(await readText(weeklyPlanPath)).toBe(planTextBefore);
    expect(await readText(manifestPath)).toBe(manifestTextBefore);
  });

  it("throws when weekly-plan.json is missing", async () => {
    const { projectRoot, weeklyPlanPath } = await createFixtureProject();
    await rm(weeklyPlanPath);

    await expect(
      runImportPodcastAudio({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow(weeklyPlanPath);
  });

  it("throws when a done package is missing", async () => {
    const { projectRoot, weeklyPlanPath, manifestPath } = await createFixtureProject();
    const planTextBefore = await readText(weeklyPlanPath);
    const manifestTextBefore = await readText(manifestPath);

    await expect(
      runImportPodcastAudio({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow(CARD_ID);

    expect(await readText(weeklyPlanPath)).toBe(planTextBefore);
    expect(await readText(manifestPath)).toBe(manifestTextBefore);
  });

  it("throws when the required mp3 is missing", async () => {
    const { projectRoot, donePodcastDir, weeklyPlanPath, manifestPath } =
      await createFixtureProject();
    const expectedFileName = `${CARD_ID}-podcast-v${DEFAULT_VERSION}.mp3`;
    const packageDir = path.join(donePodcastDir, CARD_ID);
    await mkdir(packageDir, { recursive: true });
    await writeFile(path.join(packageDir, "transcript.md"), "# Transcript\n", "utf8");
    await writeFile(
      path.join(packageDir, "podcast.meta.json"),
      `${JSON.stringify(
        {
          cardId: CARD_ID,
          podcastVersion: DEFAULT_VERSION,
          title: DEFAULT_TITLE,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    const planTextBefore = await readText(weeklyPlanPath);
    const manifestTextBefore = await readText(manifestPath);

    await expect(
      runImportPodcastAudio({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow(expectedFileName);

    expect(await readText(weeklyPlanPath)).toBe(planTextBefore);
    expect(await readText(manifestPath)).toBe(manifestTextBefore);
  });

  it("throws when transcript.md is missing", async () => {
    const { projectRoot, donePodcastDir, weeklyPlanPath, manifestPath } =
      await createFixtureProject();
    const packageDir = path.join(donePodcastDir, CARD_ID);
    await mkdir(packageDir, { recursive: true });
    await writeFile(
      path.join(packageDir, `${CARD_ID}-podcast-v${DEFAULT_VERSION}.mp3`),
      Buffer.from("audio"),
    );
    await writeFile(
      path.join(packageDir, "podcast.meta.json"),
      `${JSON.stringify(
        {
          cardId: CARD_ID,
          podcastVersion: DEFAULT_VERSION,
          title: DEFAULT_TITLE,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    const planTextBefore = await readText(weeklyPlanPath);
    const manifestTextBefore = await readText(manifestPath);

    await expect(
      runImportPodcastAudio({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow("transcript.md");

    expect(await readText(weeklyPlanPath)).toBe(planTextBefore);
    expect(await readText(manifestPath)).toBe(manifestTextBefore);
  });

  it("throws when podcast.meta.json is missing", async () => {
    const { projectRoot, donePodcastDir, weeklyPlanPath, manifestPath } =
      await createFixtureProject();
    const packageDir = path.join(donePodcastDir, CARD_ID);
    await mkdir(packageDir, { recursive: true });
    await writeFile(
      path.join(packageDir, `${CARD_ID}-podcast-v${DEFAULT_VERSION}.mp3`),
      Buffer.from("audio"),
    );
    await writeFile(path.join(packageDir, "transcript.md"), "# Transcript\n", "utf8");
    const planTextBefore = await readText(weeklyPlanPath);
    const manifestTextBefore = await readText(manifestPath);

    await expect(
      runImportPodcastAudio({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow("Missing podcast.meta.json");

    expect(await readText(weeklyPlanPath)).toBe(planTextBefore);
    expect(await readText(manifestPath)).toBe(manifestTextBefore);
  });

  it("throws when podcast.meta.json is missing required fields", async () => {
    const { projectRoot, donePodcastDir, weeklyPlanPath, manifestPath } =
      await createFixtureProject();
    const metaPath = path.join(donePodcastDir, CARD_ID, "podcast.meta.json");
    await createDonePackage(donePodcastDir);
    await writeFile(metaPath, `${JSON.stringify({ cardId: CARD_ID }, null, 2)}\n`, "utf8");
    const planTextBefore = await readText(weeklyPlanPath);
    const manifestTextBefore = await readText(manifestPath);

    await expect(
      runImportPodcastAudio({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow("podcast.meta.json");
    await expect(
      runImportPodcastAudio({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow("podcastVersion");
    await writeFile(
      metaPath,
      `${JSON.stringify(
        {
          cardId: CARD_ID,
          podcastVersion: DEFAULT_VERSION,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await expect(
      runImportPodcastAudio({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow("title");

    expect(await readText(weeklyPlanPath)).toBe(planTextBefore);
    expect(await readText(manifestPath)).toBe(manifestTextBefore);
  });

  it("throws when meta cardId mismatches the plan", async () => {
    const { projectRoot, donePodcastDir, weeklyPlanPath, manifestPath } =
      await createFixtureProject();
    await createDonePackage(donePodcastDir, {
      metaCardId: `${CARD_ID}-other`,
    });
    const planTextBefore = await readText(weeklyPlanPath);
    const manifestTextBefore = await readText(manifestPath);

    await expect(
      runImportPodcastAudio({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow("cardId");

    expect(await readText(weeklyPlanPath)).toBe(planTextBefore);
    expect(await readText(manifestPath)).toBe(manifestTextBefore);
  });

  it("throws when meta version mismatches the plan even if cardId matches", async () => {
    const { projectRoot, donePodcastDir, weeklyPlanPath, manifestPath } =
      await createFixtureProject();
    await createDonePackage(donePodcastDir, {
      metaVersion: DEFAULT_VERSION + 1,
    });
    const planTextBefore = await readText(weeklyPlanPath);
    const manifestTextBefore = await readText(manifestPath);

    await expect(
      runImportPodcastAudio({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow("version mismatch");

    expect(await readText(weeklyPlanPath)).toBe(planTextBefore);
    expect(await readText(manifestPath)).toBe(manifestTextBefore);
  });

  it("copies missing destination files and updates weekly plan plus manifest", async () => {
    const { projectRoot, donePodcastDir, weeklyPlanPath, manifestPath } =
      await createFixtureProject({
        manifestItems: [
          {
            cardId: "2026-01-01-old-item",
            status: "published",
            version: 1,
            title: "旧条目",
            audioUrl: "/audio/published/2026-01-01-old-item-podcast-v1.mp3",
            transcriptUrl: "/transcripts/published/2026-01-01-old-item-podcast-v1.md",
            duration: 100,
            sizeBytes: 10,
            checksum: "sha256-old",
          },
        ],
      });
    const audioBytes = Buffer.from("fresh-audio");
    const transcriptText = "# Transcript\nhello\n";
    await createDonePackage(donePodcastDir, {
      audioBytes,
      transcriptText,
      metaOverrides: {
        duration: 245,
        targetDurationSec: 200,
      },
    });

    const result = await runImportPodcastAudio({ projectRoot, weekId: WEEK_ID });

    expect(result.importedCount).toBe(1);

    const destinationAudio = path.join(
      projectRoot,
      "public",
      "audio",
      "published",
      `${CARD_ID}-podcast-v${DEFAULT_VERSION}.mp3`,
    );
    const destinationTranscript = path.join(
      projectRoot,
      "public",
      "transcripts",
      "published",
      `${CARD_ID}-podcast-v${DEFAULT_VERSION}.md`,
    );

    expect(await readFile(destinationAudio)).toEqual(audioBytes);
    expect(await readText(destinationTranscript)).toBe(transcriptText);

    const plan = await readJson(weeklyPlanPath);
    expect(plan.preservedTopLevel).toEqual({ note: "keep" });
    expect(plan.cards[0].extraField).toEqual({ keepMe: true });
    expect(plan.cards[0].podcast).toMatchObject({
      status: "published",
      version: DEFAULT_VERSION,
      title: DEFAULT_TITLE,
      targetDurationSec: 200,
      audioUrl: `/audio/published/${CARD_ID}-podcast-v${DEFAULT_VERSION}.mp3`,
      transcriptUrl: `/transcripts/published/${CARD_ID}-podcast-v${DEFAULT_VERSION}.md`,
      duration: 245,
      sizeBytes: audioBytes.length,
      checksum: checksumFor(audioBytes),
    });

    const manifest = await readJson(manifestPath);
    expect(manifest.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cardId: "2026-01-01-old-item",
          title: "旧条目",
        }),
        expect.objectContaining({
          cardId: CARD_ID,
          status: "published",
          version: DEFAULT_VERSION,
          title: DEFAULT_TITLE,
          audioUrl: `/audio/published/${CARD_ID}-podcast-v${DEFAULT_VERSION}.mp3`,
          transcriptUrl: `/transcripts/published/${CARD_ID}-podcast-v${DEFAULT_VERSION}.md`,
          duration: 245,
          sizeBytes: audioBytes.length,
          checksum: checksumFor(audioBytes),
        }),
      ]),
    );
  });

  it("is idempotent when the destination already has the same checksum", async () => {
    const { projectRoot, donePodcastDir, publicAudioDir, publicTranscriptDir, weeklyPlanPath } =
      await createFixtureProject();
    const { audioBytes, transcriptText } = await createDonePackage(donePodcastDir);
    const destinationAudio = path.join(
      publicAudioDir,
      `${CARD_ID}-podcast-v${DEFAULT_VERSION}.mp3`,
    );
    const destinationTranscript = path.join(
      publicTranscriptDir,
      `${CARD_ID}-podcast-v${DEFAULT_VERSION}.md`,
    );
    await copyFile(
      path.join(donePodcastDir, CARD_ID, `${CARD_ID}-podcast-v${DEFAULT_VERSION}.mp3`),
      destinationAudio,
    );
    await writeFile(destinationTranscript, transcriptText, "utf8");

    const result = await runImportPodcastAudio({ projectRoot, weekId: WEEK_ID });

    expect(result.importedCount).toBe(1);
    expect(await readFile(destinationAudio)).toEqual(audioBytes);
    expect(await readText(destinationTranscript)).toBe(transcriptText);

    const plan = await readJson(weeklyPlanPath);
    expect(plan.cards[0].podcast).toMatchObject({
      status: "published",
      checksum: checksumFor(audioBytes),
    });
  });

  it("does not rewrite weekly plan or manifest on the second identical run", async () => {
    const { projectRoot, donePodcastDir, weeklyPlanPath, manifestPath } =
      await createFixtureProject();
    await createDonePackage(donePodcastDir, {
      audioBytes: Buffer.from("same-audio-twice"),
      transcriptText: "# Transcript\nsame\n",
      metaOverrides: {
        duration: 188,
        targetDurationSec: 190,
      },
    });

    await runImportPodcastAudio({ projectRoot, weekId: WEEK_ID });
    const planTextAfterFirstRun = await readText(weeklyPlanPath);
    const manifestTextAfterFirstRun = await readText(manifestPath);

    await runImportPodcastAudio({ projectRoot, weekId: WEEK_ID });

    expect(await readText(weeklyPlanPath)).toBe(planTextAfterFirstRun);
    expect(await readText(manifestPath)).toBe(manifestTextAfterFirstRun);
  });

  it("throws when destination audio exists with different bytes and leaves files and json unchanged", async () => {
    const { projectRoot, donePodcastDir, publicAudioDir, weeklyPlanPath, manifestPath } =
      await createFixtureProject();
    const { audioBytes } = await createDonePackage(donePodcastDir, {
      transcriptText: "# Transcript\nsource\n",
    });
    const destinationAudio = path.join(
      publicAudioDir,
      `${CARD_ID}-podcast-v${DEFAULT_VERSION}.mp3`,
    );
    const destinationBytes = Buffer.from("different-audio");
    await writeFile(destinationAudio, destinationBytes);
    const planTextBefore = await readText(weeklyPlanPath);
    const manifestTextBefore = await readText(manifestPath);

    await expect(
      runImportPodcastAudio({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow(destinationAudio);

    expect(await readFile(destinationAudio)).toEqual(destinationBytes);
    expect(audioBytes.equals(destinationBytes)).toBe(false);
    expect(await readText(weeklyPlanPath)).toBe(planTextBefore);
    expect(await readText(manifestPath)).toBe(manifestTextBefore);
  });

  it("throws when destination transcript exists with different bytes and leaves files and json unchanged", async () => {
    const { projectRoot, donePodcastDir, publicTranscriptDir, weeklyPlanPath, manifestPath } =
      await createFixtureProject();
    const transcriptText = "# Transcript\nsource\n";
    await createDonePackage(donePodcastDir, {
      transcriptText,
    });
    const destinationTranscript = path.join(
      publicTranscriptDir,
      `${CARD_ID}-podcast-v${DEFAULT_VERSION}.md`,
    );
    const destinationText = "# Transcript\ndifferent\n";
    await writeFile(destinationTranscript, destinationText, "utf8");
    const planTextBefore = await readText(weeklyPlanPath);
    const manifestTextBefore = await readText(manifestPath);

    await expect(
      runImportPodcastAudio({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow(destinationTranscript);

    expect(await readText(destinationTranscript)).toBe(destinationText);
    expect(await readText(weeklyPlanPath)).toBe(planTextBefore);
    expect(await readText(manifestPath)).toBe(manifestTextBefore);
  });

  it("preserves unrelated manifest items and upserts an existing same card version", async () => {
    const existingManifestItem = {
      cardId: CARD_ID,
      status: "published",
      version: DEFAULT_VERSION,
      title: "旧标题",
      audioUrl: "/audio/published/old.mp3",
      transcriptUrl: "/transcripts/published/old.md",
      duration: 1,
      sizeBytes: 1,
      checksum: "sha256-old",
      speakerPair: "host-a-host-b",
      note: "preserve-me",
    };
    const unrelatedItem = {
      cardId: "2026-02-02-unrelated",
      status: "published",
      version: 1,
      title: "不相关",
      audioUrl: "/audio/published/unrelated.mp3",
      transcriptUrl: "/transcripts/published/unrelated.md",
      duration: 10,
      sizeBytes: 10,
      checksum: "sha256-unrelated",
    };
    const { projectRoot, donePodcastDir, manifestPath } = await createFixtureProject({
      manifestItems: [existingManifestItem, unrelatedItem],
    });
    const audioBytes = Buffer.from("replacement-audio");
    await createDonePackage(donePodcastDir, {
      audioBytes,
      metaOverrides: {
        duration: 360,
      },
    });

    await runImportPodcastAudio({ projectRoot, weekId: WEEK_ID });

    const manifest = await readJson(manifestPath);
    expect(manifest.items).toHaveLength(2);
    expect(manifest.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining(unrelatedItem),
        expect.objectContaining({
          cardId: CARD_ID,
          version: DEFAULT_VERSION,
          title: DEFAULT_TITLE,
          duration: 360,
          sizeBytes: audioBytes.length,
          checksum: checksumFor(audioBytes),
          speakerPair: "host-a-host-b",
          note: "preserve-me",
        }),
      ]),
    );
  });

  it("restores the original manifest text if weekly plan write fails after manifest write", async () => {
    const { projectRoot, donePodcastDir, weeklyPlanPath, manifestPath } =
      await createFixtureProject();
    await createDonePackage(donePodcastDir, {
      audioBytes: Buffer.from("rollback-audio"),
      transcriptText: "# Transcript\nrollback\n",
      metaOverrides: {
        duration: 199,
      },
    });
    const manifestTextBefore = await readText(manifestPath);
    const originalWriter = importPodcastAudioInternals.writeTextFileAtomically;
    let manifestWriteCount = 0;

    importPodcastAudioInternals.writeTextFileAtomically = async (filePath, text) => {
      if (filePath === manifestPath) {
        manifestWriteCount += 1;
        return originalWriter(filePath, text);
      }

      if (filePath === weeklyPlanPath) {
        throw new Error("Injected weekly plan write failure");
      }

      return originalWriter(filePath, text);
    };

    await expect(
      runImportPodcastAudio({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow("Injected weekly plan write failure");

    expect(manifestWriteCount).toBe(2);
    expect(await readText(manifestPath)).toBe(manifestTextBefore);
  });

  it("throws before publishing JSON if source audio changes between checksum and copy", async () => {
    const { projectRoot, donePodcastDir, publicAudioDir, weeklyPlanPath, manifestPath } =
      await createFixtureProject();
    const { mp3FileName } = await createDonePackage(donePodcastDir, {
      audioBytes: Buffer.from("stable-at-validation"),
      transcriptText: "# Transcript\nrace\n",
    });
    const sourceAudioPath = path.join(donePodcastDir, CARD_ID, mp3FileName);
    const destinationAudioPath = path.join(publicAudioDir, mp3FileName);
    const planTextBefore = await readText(weeklyPlanPath);
    const manifestTextBefore = await readText(manifestPath);

    importPodcastAudioInternals.afterPrepareOperations = async () => {
      await writeFile(sourceAudioPath, Buffer.from("changed-before-copy"));
    };

    await expect(
      runImportPodcastAudio({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow("changed during copy");

    await expect(readFile(destinationAudioPath)).rejects.toThrow();
    expect(await readText(weeklyPlanPath)).toBe(planTextBefore);
    expect(await readText(manifestPath)).toBe(manifestTextBefore);
  });

  it("throws on invalid cardId before any partial import or manifest writes", async () => {
    const validCardId = CARD_ID;
    const invalidCardId = "../escape";
    const { projectRoot, donePodcastDir, publicAudioDir, weeklyPlanPath, manifestPath } =
      await createFixtureProject({
        cards: [
          buildPlanCard({ cardId: validCardId }),
          buildPlanCard({ cardId: invalidCardId }),
        ],
      });
    await createDonePackage(donePodcastDir, {
      cardId: validCardId,
    });
    const planTextBefore = await readText(weeklyPlanPath);
    const manifestTextBefore = await readText(manifestPath);

    await expect(
      runImportPodcastAudio({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow(`Invalid cardId: ${invalidCardId}`);

    await expect(
      readFile(path.join(publicAudioDir, `${validCardId}-podcast-v${DEFAULT_VERSION}.mp3`)),
    ).rejects.toThrow();
    expect(await readText(weeklyPlanPath)).toBe(planTextBefore);
    expect(await readText(manifestPath)).toBe(manifestTextBefore);
  });
});

describe("import-podcast-audio CLI", () => {
  it("prints imported count for a valid week id", async () => {
    const { projectRoot, donePodcastDir } = await createFixtureProject();
    await createDonePackage(donePodcastDir);
    const scriptPath = path.resolve("scripts/import-podcast-audio.mjs");

    const result = spawnSync(process.execPath, [scriptPath, WEEK_ID], {
      cwd: projectRoot,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Imported 1 audio files");
  });

  it("exits nonzero with a clear message when weekId is missing", async () => {
    const { projectRoot } = await createFixtureProject();
    const scriptPath = path.resolve("scripts/import-podcast-audio.mjs");

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: projectRoot,
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("weekId is required");
  });
});
