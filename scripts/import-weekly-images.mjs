import { createHash } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJsonFile, writeJsonFileStable } from "./lib/weekly-json.mjs";
import { assertSafeWeekId, getWeeklyWorkspacePaths } from "./lib/weekly-paths.mjs";

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
} = {}) {
  if (!weekId) {
    throw new Error("weekId is required");
  }

  const safeWeekId = assertSafeWeekId(weekId);
  const paths = getWeeklyWorkspacePaths(projectRoot, safeWeekId);
  const weeklyPlan = await loadWeeklyPlan(paths.weeklyPlan);
  const destinationDir = path.join(projectRoot, "public", "generated-cards");

  const operations = await Promise.all(
    weeklyPlan.cards.map(async (card) => {
      const safeCardId = assertSafeCardId(card.cardId);
      const sourcePath = resolveWithinDir(paths.rawImagesDir, `${safeCardId}.png`);
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
    weekId: safeWeekId,
    importedCount: operations.length,
  };
}

async function runCli() {
  const weekId = process.argv[2];
  const result = await runImportWeeklyImages({ weekId });
  console.log(`Imported ${result.importedCount} images for ${result.weekId}`);
}

const scriptEntryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptEntryPath) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
