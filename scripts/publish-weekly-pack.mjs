import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runImportPodcastAudio } from "./import-podcast-audio.mjs";
import { runImportWeeklyImages } from "./import-weekly-images.mjs";
import { readJsonFile } from "./lib/weekly-json.mjs";
import {
  assertSafeIncomingWeekKey,
  getWeeklyExchangeWorkspacePaths,
  publicUrlToFilePath,
} from "./lib/weekly-paths.mjs";

function stableJsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isMissingError(error) {
  return error && typeof error === "object" && "code" in error && error.code === "ENOENT";
}

async function writeTextFileAtomically(filePath, text) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${randomUUID()}`;
  await writeFile(tempPath, text, "utf8");
  await rename(tempPath, filePath);
}

async function assertFileExists(filePath, label) {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error(`${label} is not a file: ${filePath}`);
    }
  } catch (error) {
    if (isMissingError(error)) {
      throw new Error(`Missing ${label}: ${filePath}`);
    }

    throw error;
  }
}

async function loadJsonWithText(filePath, label) {
  let text;

  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if (isMissingError(error)) {
      throw new Error(`${label} not found: ${filePath}`);
    }

    throw error;
  }

  return {
    text,
    value: JSON.parse(text),
  };
}

function assertCardsArray(value, filePath) {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${filePath} to contain a JSON array`);
  }
}

function assertReadableText(value, label) {
  if (typeof value !== "string") return;
  if (value.includes("�") || /\?{2,}/.test(value)) {
    throw new Error(`${label} contains suspicious text corruption: ${value}`);
  }
}

function assertReadableCardText(card) {
  for (const fieldName of ["title", "category", "summary"]) {
    assertReadableText(card?.[fieldName], `Card ${card?.id ?? "<unknown>"} ${fieldName}`);
  }
}

function buildFormalCard(planCard, now) {
  return {
    id: planCard.cardId,
    title: planCard.title,
    subtitle: planCard.subtitle ?? planCard.content.subtitle ?? "",
    category: planCard.category,
    subCategory: planCard.subCategory ?? planCard.content.subCategory ?? "",
    difficulty: planCard.difficulty ?? planCard.content.difficulty ?? "入门",
    cardDate: planCard.cardDate,
    imageUrl: planCard.image.publishedUrl,
    summary: planCard.summary,
    keywords: Array.isArray(planCard.keywords) ? planCard.keywords : [],
    completed: false,
    favorite: false,
    needReview: false,
    podcast: {
      status: "published",
      version: planCard.podcast.version ?? 1,
      title: planCard.podcast.title ?? planCard.title,
      duration: planCard.podcast.duration ?? null,
      audioUrl: planCard.podcast.audioUrl,
      transcriptUrl: planCard.podcast.transcriptUrl,
      sizeBytes: planCard.podcast.sizeBytes ?? null,
      checksum: planCard.podcast.checksum ?? null,
      updatedAt: planCard.podcast.updatedAt ?? now,
      archivedVersions: Array.isArray(planCard.podcast.archivedVersions)
        ? planCard.podcast.archivedVersions
        : [],
    },
    content: planCard.content,
  };
}

async function verifyWrittenCards(projectRoot, planCards, cards) {
  for (const planCard of planCards) {
    const card = cards.find((item) => item?.id === planCard.cardId);
    if (!card) {
      throw new Error(`Written card not found after data/cards.json write: ${planCard.cardId}`);
    }

    assertReadableCardText(card);
    await assertFileExists(
      publicUrlToFilePath(card.imageUrl, projectRoot),
      `image for ${planCard.cardId}`,
    );
    await assertFileExists(
      publicUrlToFilePath(card.podcast.audioUrl, projectRoot),
      `podcast audio for ${planCard.cardId}`,
    );
    await assertFileExists(
      publicUrlToFilePath(card.podcast.transcriptUrl, projectRoot),
      `podcast transcript for ${planCard.cardId}`,
    );
  }
}

export async function runPublishWeeklyPack({
  projectRoot = process.cwd(),
  weekKey,
  now = new Date().toISOString(),
} = {}) {
  if (!weekKey) {
    throw new Error("weekKey is required");
  }

  const safeWeekKey = assertSafeIncomingWeekKey(weekKey);
  const paths = getWeeklyExchangeWorkspacePaths(projectRoot, safeWeekKey);
  const cardsPath = path.join(projectRoot, "data", "cards.json");

  await runImportWeeklyImages({ projectRoot, weekKey: safeWeekKey });
  await runImportPodcastAudio({ projectRoot, weekKey: safeWeekKey });

  const weeklyPlan = await readJsonFile(paths.weeklyPlan);
  const cardsState = await loadJsonWithText(cardsPath, "data/cards.json");
  const currentCards = cardsState.value;
  assertCardsArray(weeklyPlan.cards, paths.weeklyPlan);
  assertCardsArray(currentCards, cardsPath);

  const existingIds = new Set(currentCards.map((card) => card?.id));
  const newPlanCards = weeklyPlan.cards.filter((card) => !existingIds.has(card.cardId));
  const newCards = newPlanCards.map((card) => buildFormalCard(card, now));
  for (const card of newCards) {
    assertReadableCardText(card);
  }

  const nextCards = [...currentCards, ...newCards];
  const nextCardsText = stableJsonText(nextCards);

  if (nextCardsText !== cardsState.text) {
    await writeTextFileAtomically(cardsPath, nextCardsText);
  }

  const writtenCards = await readJsonFile(cardsPath);
  assertCardsArray(writtenCards, cardsPath);
  await verifyWrittenCards(projectRoot, weeklyPlan.cards, writtenCards);

  const reportLines = [
    `weekKey: ${safeWeekKey}`,
    `appendedCount: ${newCards.length}`,
    `skippedExistingCount: ${weeklyPlan.cards.length - newCards.length}`,
    `publishedAt: ${now}`,
  ];
  await writeTextFileAtomically(paths.macImportReport, `${reportLines.join("\n")}\n`);

  return {
    weekKey: safeWeekKey,
    appendedCount: newCards.length,
    skippedExistingCount: weeklyPlan.cards.length - newCards.length,
  };
}

async function runCli() {
  const weekKey = process.argv[2];
  const result = await runPublishWeeklyPack({ weekKey });
  console.log(
    `Published ${result.weekKey}: appended ${result.appendedCount}, skipped ${result.skippedExistingCount}`,
  );
}

const scriptEntryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptEntryPath) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
