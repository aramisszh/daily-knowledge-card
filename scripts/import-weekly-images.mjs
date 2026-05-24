import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJsonFile, writeJsonFileStable } from "./lib/weekly-json.mjs";
import {
  assertSafeIncomingWeekKey,
  assertSafeWeekId,
  getLegacyIncomingWeeklyPackPaths,
  getWeeklyExchangeWorkspacePaths,
  getWeeklyWorkspacePaths,
} from "./lib/weekly-paths.mjs";

const CARD_ID_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function readBuffer(filePath, missingMessage) {
  try {
    return await readFile(filePath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error(missingMessage);
    }

    throw error;
  }
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function formatChecksum(hex) {
  return `sha256-${hex}`;
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

  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(`Resolved path escapes target directory: ${resolvedPath}`);
  }

  return resolvedPath;
}

async function loadWeeklyPlan(weeklyPlanPath) {
  try {
    return await readJsonFile(weeklyPlanPath);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith(`Failed to read JSON file ${weeklyPlanPath}: ENOENT`)
    ) {
      throw new Error(`weekly-plan.json not found: ${weeklyPlanPath}`);
    }

    throw error;
  }
}

async function resolveIncomingSourceImageDir(paths) {
  for (const candidate of [paths.imageAssetsDir, paths.rawImagesDir]) {
    try {
      const candidateStat = await stat(candidate);
      if (candidateStat.isDirectory()) {
        return candidate;
      }
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
        throw error;
      }
    }
  }

  throw new Error(`Missing source image directory for ${paths.weekDir}`);
}

async function resolveIncomingWeekPaths(projectRoot, weekKey) {
  const normalizedWeekKey = assertSafeIncomingWeekKey(weekKey);
  const newPaths = getWeeklyExchangeWorkspacePaths(projectRoot, normalizedWeekKey);

  try {
    await stat(newPaths.weeklyPlan);
    return newPaths;
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) {
      throw error;
    }
  }

  return getLegacyIncomingWeeklyPackPaths(projectRoot, normalizedWeekKey);
}

async function readDestinationChecksumIfPresent(destinationPath) {
  try {
    const destinationBuffer = await readFile(destinationPath);
    return sha256(destinationBuffer);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function copyImageExclusively(sourcePath, destinationPath, cardId, sourceChecksumHex) {
  try {
    await copyFile(sourcePath, destinationPath, fsConstants.COPYFILE_EXCL);
    return;
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "EEXIST")) {
      throw error;
    }
  }

  const destinationChecksumHex = await readDestinationChecksumIfPresent(destinationPath);

  if (destinationChecksumHex === sourceChecksumHex) {
    return;
  }

  throw new Error(
    `Destination image already exists with different bytes for ${cardId}: ${destinationPath}`,
  );
}

export async function runImportWeeklyImages({
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
  const weeklyPlan = await loadWeeklyPlan(paths.weeklyPlan);
  const destinationDir = path.join(projectRoot, "public", "generated-cards");
  const sourceImageDir = usingIncomingPack
    ? await resolveIncomingSourceImageDir(paths)
    : paths.rawImagesDir;

  const operations = await Promise.all(
    weeklyPlan.cards.map(async (card) => {
      const safeCardId = assertSafeCardId(card.cardId);
      const sourceFileName =
        typeof card?.image?.sourceFileName === "string" && card.image.sourceFileName.length > 0
          ? card.image.sourceFileName
          : `${safeCardId}.png`;
      const sourcePath = resolveWithinDir(sourceImageDir, sourceFileName);
      const sourceBuffer = await readBuffer(
        sourcePath,
        `Missing source image for ${safeCardId}: ${sourcePath}`,
      );
      const sourceStat = await stat(sourcePath);
      const sourceChecksumHex = sha256(sourceBuffer);
      const destinationPath = resolveWithinDir(destinationDir, `${safeCardId}.png`);

      return {
        cardId: safeCardId,
        sourcePath,
        destinationPath,
        sizeBytes: sourceStat.size,
        checksum: formatChecksum(sourceChecksumHex),
        sourceChecksumHex,
      };
    }),
  );

  await mkdir(destinationDir, { recursive: true });

  for (const operation of operations) {
    await copyImageExclusively(
      operation.sourcePath,
      operation.destinationPath,
      operation.cardId,
      operation.sourceChecksumHex,
    );
  }

  const operationsByCardId = new Map(
    operations.map((operation) => [operation.cardId, operation]),
  );

  const updatedPlan = {
    ...weeklyPlan,
    cards: weeklyPlan.cards.map((card) => {
      const operation = operationsByCardId.get(card.cardId);
      return {
        ...card,
        image: {
          ...card.image,
          status: "imported",
          publishedUrl: `/generated-cards/${card.cardId}.png`,
          sizeBytes: operation.sizeBytes,
          checksum: operation.checksum,
        },
      };
    }),
  };

  await writeJsonFileStable(paths.weeklyPlan, updatedPlan);

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
  const result = await runImportWeeklyImages(
    isIncomingWeekKey ? { weekKey: value } : { weekId: value },
  );
  console.log(
    `Imported ${result.importedCount} images for ${result.weekKey ?? result.weekId}`,
  );
}

const scriptEntryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptEntryPath) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
