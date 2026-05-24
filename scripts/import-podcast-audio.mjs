import { createHash, randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import {
  copyFile,
  link,
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readJsonFile } from "./lib/weekly-json.mjs";
import {
  assertSafeIncomingWeekKey,
  assertSafeWeekId,
  getLegacyIncomingWeeklyPackPaths,
  getWeeklyExchangeWorkspacePaths,
  getWeeklyWorkspacePaths,
} from "./lib/weekly-paths.mjs";

const CARD_ID_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function formatChecksum(hex) {
  return `sha256-${hex}`;
}

function stableJsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isMissingError(error) {
  return error && typeof error === "object" && "code" in error && error.code === "ENOENT";
}

function assertSafeCardId(cardId) {
  if (typeof cardId !== "string" || !CARD_ID_PATTERN.test(cardId)) {
    throw new Error(`Invalid cardId: ${cardId}`);
  }

  return cardId;
}

function resolveWithinDir(rootDir, fileName) {
  const resolvedPath = path.resolve(rootDir, fileName);
  const relativePath = path.relative(rootDir, resolvedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Resolved path escapes target directory: ${resolvedPath}`);
  }

  return resolvedPath;
}

async function loadJsonFileWithText(filePath, missingMessage) {
  let text;

  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if (isMissingError(error)) {
      throw new Error(missingMessage);
    }

    throw error;
  }

  try {
    return {
      text,
      value: JSON.parse(text),
    };
  } catch (error) {
    throw new Error(
      `Failed to parse JSON file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function readRequiredBuffer(filePath, missingMessage) {
  try {
    return await readFile(filePath);
  } catch (error) {
    if (isMissingError(error)) {
      throw new Error(missingMessage);
    }

    throw error;
  }
}

async function readRequiredText(filePath, missingMessage) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (isMissingError(error)) {
      throw new Error(missingMessage);
    }

    throw error;
  }
}

async function readRequiredJson(filePath, missingMessage) {
  try {
    return await readJsonFile(filePath);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith(`Failed to read JSON file ${filePath}: ENOENT`)
    ) {
      throw new Error(missingMessage);
    }

    throw error;
  }
}

function resolvePlanPodcastVersion(card) {
  if (Number.isInteger(card?.podcast?.version) && card.podcast.version > 0) {
    return card.podcast.version;
  }

  if (Number.isInteger(card?.meta?.podcastVersion) && card.meta.podcastVersion > 0) {
    return card.meta.podcastVersion;
  }

  return 1;
}

function validateMeta(meta, expectedCardId, expectedVersion, metaPath) {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    throw new Error(`Invalid podcast.meta.json at ${metaPath}: expected an object`);
  }

  if (typeof meta.cardId !== "string" || meta.cardId.length === 0) {
    throw new Error(`Invalid podcast.meta.json at ${metaPath}: missing required field cardId`);
  }

  const resolvedVersion =
    Number.isInteger(meta.podcastVersion) && meta.podcastVersion > 0
      ? meta.podcastVersion
      : 1;

  if (typeof meta.title !== "string" || meta.title.trim().length === 0) {
    throw new Error(`Invalid podcast.meta.json at ${metaPath}: missing required field title`);
  }

  if (meta.cardId !== expectedCardId) {
    throw new Error(
      `podcast.meta.json cardId mismatch for ${expectedCardId}: expected ${expectedCardId}, got ${meta.cardId}`,
    );
  }

  if (resolvedVersion !== expectedVersion) {
    throw new Error(
      `podcast.meta.json version mismatch for ${expectedCardId}: expected ${expectedVersion}, got ${resolvedVersion}`,
    );
  }

  if (
    "targetDurationSec" in meta &&
    meta.targetDurationSec !== null &&
    (!Number.isFinite(meta.targetDurationSec) || meta.targetDurationSec < 0)
  ) {
    throw new Error(`Invalid podcast.meta.json at ${metaPath}: targetDurationSec must be a number`);
  }

  if (
    "duration" in meta &&
    meta.duration !== null &&
    (!Number.isFinite(meta.duration) || meta.duration < 0)
  ) {
    throw new Error(`Invalid podcast.meta.json at ${metaPath}: duration must be a number`);
  }
}

async function readDestinationChecksumIfPresent(destinationPath, encoding = null) {
  try {
    const content = encoding ? await readFile(destinationPath, encoding) : await readFile(destinationPath);
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, encoding ?? "utf8");
    return sha256(buffer);
  } catch (error) {
    if (isMissingError(error)) {
      return null;
    }

    throw error;
  }
}

async function assertNoDestinationConflict(destinationPath, sourceChecksumHex, label) {
  const destinationChecksumHex = await readDestinationChecksumIfPresent(destinationPath);

  if (destinationChecksumHex === null || destinationChecksumHex === sourceChecksumHex) {
    return;
  }

  throw new Error(`Destination ${label} already exists with different bytes: ${destinationPath}`);
}

async function copyFileViaTempLink(sourcePath, destinationPath, sourceChecksumHex, label) {
  const existingChecksumHex = await readDestinationChecksumIfPresent(destinationPath);
  if (existingChecksumHex !== null) {
    if (existingChecksumHex === sourceChecksumHex) {
      return;
    }

    throw new Error(`Destination ${label} already exists with different bytes: ${destinationPath}`);
  }

  const tempPath = `${destinationPath}.tmp-${randomUUID()}`;

  try {
    await copyFile(sourcePath, tempPath, fsConstants.COPYFILE_EXCL);
    const tempChecksumHex = await readDestinationChecksumIfPresent(tempPath);

    if (tempChecksumHex !== sourceChecksumHex) {
      throw new Error(`Source ${label} changed during copy: ${sourcePath}`);
    }

    try {
      await link(tempPath, destinationPath);
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
        await assertNoDestinationConflict(destinationPath, sourceChecksumHex, label);
        return;
      }

      throw error;
    }
  } finally {
    await unlink(tempPath).catch((error) => {
      if (!isMissingError(error)) {
        throw error;
      }
    });
  }
}

async function writeTextFileAtomically(filePath, text) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${randomUUID()}`;
  await writeFile(tempPath, text, "utf8");
  await rename(tempPath, filePath);
}

export const importPodcastAudioInternals = {
  afterPrepareOperations: async () => {},
  defaultAfterPrepareOperations: async () => {},
  defaultWriteTextFileAtomically: writeTextFileAtomically,
  writeTextFileAtomically,
  now: () => new Date().toISOString(),
};

function buildCanonicalManifestEntry(existingItem, cardId, version, meta, audioUrl, transcriptUrl, sizeBytes, checksum) {
  return {
    ...(existingItem ?? {}),
    cardId,
    status: "published",
    version,
    title: meta.title,
    audioUrl,
    transcriptUrl,
    duration: meta.duration ?? null,
    sizeBytes,
    checksum,
  };
}

function buildUpdatedPlanCandidate(weeklyPlan, operationsByCardId) {
  return {
    ...weeklyPlan,
    cards: weeklyPlan.cards.map((card) => {
      const operation = operationsByCardId.get(card.cardId);

      if (!operation) {
        return card;
      }

      return {
        ...card,
        podcast: {
          ...card.podcast,
          status: "published",
          version: operation.version,
          title: operation.meta.title,
          targetDurationSec:
            operation.meta.targetDurationSec ?? card?.podcast?.targetDurationSec ?? null,
          audioUrl: operation.audioUrl,
          transcriptUrl: operation.transcriptUrl,
          duration: operation.meta.duration ?? null,
          sizeBytes: operation.sizeBytes,
          checksum: formatChecksum(operation.audioChecksumHex),
        },
      };
    }),
  };
}

function buildUpdatedManifestCandidate(manifest, operations) {
  const existingItems = Array.isArray(manifest.items) ? manifest.items : [];
  const operationKeySet = new Set(
    operations.map((operation) => `${operation.cardId}::${operation.version}`),
  );
  const existingItemByKey = new Map(
    existingItems.map((item) => [`${item?.cardId}::${item?.version}`, item]),
  );

  return {
    ...manifest,
    items: [
      ...existingItems.filter(
        (item) => !operationKeySet.has(`${item?.cardId}::${item?.version}`),
      ),
      ...operations.map((operation) =>
        buildCanonicalManifestEntry(
          existingItemByKey.get(`${operation.cardId}::${operation.version}`),
          operation.cardId,
          operation.version,
          operation.meta,
          operation.audioUrl,
          operation.transcriptUrl,
          operation.sizeBytes,
          formatChecksum(operation.audioChecksumHex),
        ),
      ),
    ],
  };
}

function prepareJsonWrite(currentValue, currentText, candidateValue, now) {
  const candidateComparable = JSON.stringify(candidateValue);
  const currentComparable = JSON.stringify(currentValue);

  if (candidateComparable === currentComparable) {
    return {
      changed: false,
      value: currentValue,
      text: currentText,
    };
  }

  const nextValue = {
    ...candidateValue,
    updatedAt: now,
  };

  return {
    changed: true,
    value: nextValue,
    text: stableJsonText(nextValue),
  };
}

async function resolveIncomingWeekPaths(projectRoot, weekKey) {
  const normalizedWeekKey = assertSafeIncomingWeekKey(weekKey);
  const newPaths = getWeeklyExchangeWorkspacePaths(projectRoot, normalizedWeekKey);

  try {
    await stat(newPaths.weeklyPlan);
    return newPaths;
  } catch (error) {
    if (!(isMissingError(error))) {
      throw error;
    }
  }

  return getLegacyIncomingWeeklyPackPaths(projectRoot, normalizedWeekKey);
}

export async function runImportPodcastAudio({
  projectRoot = process.cwd(),
  weekId,
  weekKey,
} = {}) {
  if (!weekId && !weekKey) {
    throw new Error("weekId or weekKey is required");
  }

  const usingIncomingPack = Boolean(weekKey);
  const paths = usingIncomingPack
    ? await resolveIncomingWeekPaths(projectRoot, weekKey)
    : getWeeklyWorkspacePaths(projectRoot, assertSafeWeekId(weekId));
  const weeklyPlanState = await loadJsonFileWithText(
    paths.weeklyPlan,
    `weekly-plan.json not found: ${paths.weeklyPlan}`,
  );
  const manifestPath = path.join(projectRoot, "data", "podcast-manifest.json");
  const manifestState = await loadJsonFileWithText(
    manifestPath,
    `podcast-manifest.json not found: ${manifestPath}`,
  );
  const destinationAudioDir = path.join(projectRoot, "public", "audio", "published");
  const destinationTranscriptDir = path.join(
    projectRoot,
    "public",
    "transcripts",
    "published",
  );

  const operations = await Promise.all(
    weeklyPlanState.value.cards.map(async (card) => {
      const safeCardId = assertSafeCardId(card.cardId);
      const version = resolvePlanPodcastVersion(card);
      const donePackageDir = resolveWithinDir(paths.donePodcastDir, safeCardId);

      try {
        const packageStats = await stat(donePackageDir);
        if (!packageStats.isDirectory()) {
          throw new Error(`Done podcast package is not a directory for ${safeCardId}: ${donePackageDir}`);
        }
      } catch (error) {
        if (isMissingError(error)) {
          throw new Error(`Missing done podcast package for ${safeCardId}: ${donePackageDir}`);
        }

        throw error;
      }

      const mp3FileName = `${safeCardId}-podcast-v${version}.mp3`;
      const sourceAudioPath = resolveWithinDir(donePackageDir, mp3FileName);
      const sourceTranscriptPath = resolveWithinDir(donePackageDir, "transcript.md");
      const metaPath = resolveWithinDir(donePackageDir, "podcast.meta.json");

      const [audioBuffer, transcriptText, meta, audioStats] = await Promise.all([
        readRequiredBuffer(
          sourceAudioPath,
          `Missing source audio for ${safeCardId}: ${sourceAudioPath}`,
        ),
        readRequiredText(
          sourceTranscriptPath,
          `Missing source transcript for ${safeCardId}: ${sourceTranscriptPath}`,
        ),
        readRequiredJson(
          metaPath,
          `Missing podcast.meta.json for ${safeCardId}: ${metaPath}`,
        ),
        stat(sourceAudioPath).catch((error) => {
          if (isMissingError(error)) {
            throw new Error(`Missing source audio for ${safeCardId}: ${sourceAudioPath}`);
          }

          throw error;
        }),
      ]);

      validateMeta(meta, safeCardId, version, metaPath);

      const audioChecksumHex = sha256(audioBuffer);
      const transcriptChecksumHex = sha256(Buffer.from(transcriptText, "utf8"));
      const destinationAudioPath = resolveWithinDir(destinationAudioDir, mp3FileName);
      const destinationTranscriptPath = resolveWithinDir(
        destinationTranscriptDir,
        `${safeCardId}-podcast-v${version}.md`,
      );
      const audioUrl = `/audio/published/${mp3FileName}`;
      const transcriptUrl = `/transcripts/published/${safeCardId}-podcast-v${version}.md`;

      return {
        cardId: safeCardId,
        version,
        meta,
        audioChecksumHex,
        transcriptChecksumHex,
        sizeBytes: audioStats.size,
        sourceAudioPath,
        sourceTranscriptPath,
        destinationAudioPath,
        destinationTranscriptPath,
        audioUrl,
        transcriptUrl,
      };
    }),
  );

  await Promise.all(
    operations.flatMap((operation) => [
      assertNoDestinationConflict(
        operation.destinationAudioPath,
        operation.audioChecksumHex,
        "audio",
      ),
      assertNoDestinationConflict(
        operation.destinationTranscriptPath,
        operation.transcriptChecksumHex,
        "transcript",
      ),
    ]),
  );
  await importPodcastAudioInternals.afterPrepareOperations(operations);

  await mkdir(destinationAudioDir, { recursive: true });
  await mkdir(destinationTranscriptDir, { recursive: true });

  for (const operation of operations) {
    await copyFileViaTempLink(
      operation.sourceAudioPath,
      operation.destinationAudioPath,
      operation.audioChecksumHex,
      "audio",
    );
    await copyFileViaTempLink(
      operation.sourceTranscriptPath,
      operation.destinationTranscriptPath,
      operation.transcriptChecksumHex,
      "transcript",
    );
  }

  const operationsByCardId = new Map(
    operations.map((operation) => [operation.cardId, operation]),
  );
  const now = importPodcastAudioInternals.now();
  const manifestCandidate = buildUpdatedManifestCandidate(manifestState.value, operations);
  const planCandidate = buildUpdatedPlanCandidate(weeklyPlanState.value, operationsByCardId);
  const manifestWrite = prepareJsonWrite(
    manifestState.value,
    manifestState.text,
    manifestCandidate,
    now,
  );
  const planWrite = prepareJsonWrite(
    weeklyPlanState.value,
    weeklyPlanState.text,
    planCandidate,
    now,
  );

  if (manifestWrite.changed) {
    await importPodcastAudioInternals.writeTextFileAtomically(
      manifestPath,
      manifestWrite.text,
    );
  }

  try {
    if (planWrite.changed) {
      await importPodcastAudioInternals.writeTextFileAtomically(
        paths.weeklyPlan,
        planWrite.text,
      );
    }
  } catch (error) {
    if (manifestWrite.changed) {
      try {
        await importPodcastAudioInternals.writeTextFileAtomically(
          manifestPath,
          manifestState.text,
        );
      } catch (restoreError) {
        throw new Error(
          `Failed to restore podcast manifest after weekly plan write failure: ${
            restoreError instanceof Error ? restoreError.message : String(restoreError)
          }`,
        );
      }
    }

    throw error;
  }

  return {
    ...(usingIncomingPack
      ? { weekKey: assertSafeIncomingWeekKey(weekKey) }
      : { weekId: assertSafeWeekId(weekId) }),
    importedCount: operations.length,
  };
}

async function runCli() {
  const value = process.argv[2];
  const isIncomingWeekKey = typeof value === "string" && /^\d{4}-W\d{2}$/.test(value);
  const result = await runImportPodcastAudio(
    isIncomingWeekKey ? { weekKey: value } : { weekId: value },
  );
  console.log(
    `Imported ${result.importedCount} audio files for ${result.weekKey ?? result.weekId}`,
  );
}

const scriptEntryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptEntryPath) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
