import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readJsonFile } from "./lib/weekly-json.mjs";
import {
  assertSafeWeekId,
  getWeeklyWorkspacePaths,
  publicUrlToFilePath,
} from "./lib/weekly-paths.mjs";

function isMissingError(error) {
  return error && typeof error === "object" && "code" in error && error.code === "ENOENT";
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

async function loadRequiredJson(filePath, label) {
  try {
    return await readJsonFile(filePath);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith(`Failed to read JSON file ${filePath}: ENOENT`)
    ) {
      throw new Error(`${label} not found: ${filePath}`);
    }

    throw error;
  }
}

async function loadRequiredJsonWithText(filePath, label) {
  let text;

  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if (isMissingError(error)) {
      throw new Error(`${label} not found: ${filePath}`);
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

function stableJsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeTextFileAtomically(filePath, text) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${randomUUID()}`;
  await writeFile(tempPath, text, "utf8");
  await rename(tempPath, filePath);
}

export const weeklyContinueInternals = {
  defaultWriteTextFileAtomically: writeTextFileAtomically,
  writeTextFileAtomically,
};

function assertCardsArray(value, filePath) {
  if (!Array.isArray(value)) {
    throw new Error(`Expected ${filePath} to contain a JSON array`);
  }
}

function assertReadableCardText(card) {
  for (const fieldName of ["title", "category", "summary"]) {
    const value = card[fieldName];
    if (typeof value === "string" && value.includes("?")) {
      throw new Error(`Card ${card.id} has suspicious ${fieldName} text containing ?: ${value}`);
    }
  }
}

function assertRequiredString(value, label, cardId = "<unknown>") {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Card ${cardId} missing required field ${label}`);
  }
}

function assertRequiredObject(value, label, cardId = "<unknown>") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Card ${cardId} missing required field ${label}`);
  }
}

function assertRequiredArray(value, label, cardId = "<unknown>") {
  if (!Array.isArray(value)) {
    throw new Error(`Card ${cardId} missing required field ${label}`);
  }
}

function assertKnowledgePack(content, cardId) {
  assertRequiredObject(content, "content", cardId);

  for (const fieldName of [
    "title",
    "subtitle",
    "category",
    "subCategory",
    "difficulty",
    "summary",
    "coreMechanism",
    "financeAngle",
    "conclusion",
  ]) {
    assertRequiredString(content[fieldName], `content.${fieldName}`, cardId);
  }

  for (const fieldName of [
    "whyImportant",
    "keywords",
    "memoryHooks",
    "thinkingQuestions",
  ]) {
    assertRequiredArray(content[fieldName], `content.${fieldName}`, cardId);
  }

  assertRequiredObject(content.misconception, "content.misconception", cardId);
  assertRequiredString(content.misconception.title, "content.misconception.title", cardId);
  assertRequiredString(content.misconception.content, "content.misconception.content", cardId);

  for (const [index, keyword] of content.keywords.entries()) {
    assertRequiredObject(keyword, `content.keywords[${index}]`, cardId);
    assertRequiredString(keyword.term, `content.keywords[${index}].term`, cardId);
    assertRequiredString(keyword.desc, `content.keywords[${index}].desc`, cardId);
  }

  for (const [index, question] of content.thinkingQuestions.entries()) {
    assertRequiredObject(question, `content.thinkingQuestions[${index}]`, cardId);
    assertRequiredString(question.level, `content.thinkingQuestions[${index}].level`, cardId);
    assertRequiredString(question.question, `content.thinkingQuestions[${index}].question`, cardId);
    assertRequiredString(question.answer, `content.thinkingQuestions[${index}].answer`, cardId);
    assertRequiredString(question.keyPoint, `content.thinkingQuestions[${index}].keyPoint`, cardId);
  }

  if ("processSteps" in content) {
    assertRequiredArray(content.processSteps, "content.processSteps", cardId);
  }
}

function assertPlanCardReady(card) {
  assertRequiredString(card?.cardId, "cardId");
  assertRequiredString(card.cardDate, "cardDate", card.cardId);
  assertRequiredString(card.title ?? card?.content?.title, "title", card.cardId);
  assertRequiredString(card.category ?? card?.content?.category, "category", card.cardId);
  assertRequiredString(card.summary ?? card?.content?.summary, "summary", card.cardId);
  assertKnowledgePack(card.content, card.cardId);

  if (card?.image?.status !== "imported") {
    throw new Error(`Card ${card?.cardId ?? "<unknown>"} image is not imported`);
  }

  if (typeof card.image.publishedUrl !== "string" || card.image.publishedUrl.length === 0) {
    throw new Error(`Card ${card.cardId} image publishedUrl is required`);
  }

  if (card?.podcast?.status !== "published") {
    throw new Error(`Card ${card?.cardId ?? "<unknown>"} podcast is not published`);
  }

  if (typeof card.podcast.audioUrl !== "string" || card.podcast.audioUrl.length === 0) {
    throw new Error(`Card ${card.cardId} podcast audioUrl is required`);
  }

  if (typeof card.podcast.transcriptUrl !== "string" || card.podcast.transcriptUrl.length === 0) {
    throw new Error(`Card ${card.cardId} podcast transcriptUrl is required`);
  }
}

async function assertPlanCardAssetsExist(projectRoot, card) {
  await assertFileExists(
    publicUrlToFilePath(card.image.publishedUrl, projectRoot),
    `image for ${card.cardId}`,
  );
  await assertFileExists(
    publicUrlToFilePath(card.podcast.audioUrl, projectRoot),
    `podcast audio for ${card.cardId}`,
  );
  await assertFileExists(
    publicUrlToFilePath(card.podcast.transcriptUrl, projectRoot),
    `podcast transcript for ${card.cardId}`,
  );
}

function assertNoDuplicatePlanKeys(planCards) {
  const seenCardIds = new Set();
  const seenPodcastKeys = new Set();

  for (const card of planCards) {
    const cardId = card?.cardId;

    if (seenCardIds.has(cardId)) {
      throw new Error(`Duplicate cardId in weekly plan: ${cardId}`);
    }

    seenCardIds.add(cardId);

    const podcastKey = `${cardId}::${card?.podcast?.version ?? 1}`;
    if (seenPodcastKeys.has(podcastKey)) {
      throw new Error(`Duplicate podcast manifest key in weekly plan: ${podcastKey}`);
    }

    seenPodcastKeys.add(podcastKey);
  }
}

function buildFormalCard(planCard, now) {
  const content = planCard.content ?? {};
  const podcast = planCard.podcast ?? {};

  return {
    id: planCard.cardId,
    title: planCard.title ?? content.title,
    subtitle: planCard.subtitle ?? content.subtitle ?? "",
    category: planCard.category ?? content.category,
    subCategory: planCard.subCategory ?? content.subCategory ?? "",
    difficulty: planCard.difficulty ?? content.difficulty ?? "入门",
    cardDate: planCard.cardDate,
    imageUrl: planCard.image.publishedUrl,
    summary: planCard.summary ?? content.summary ?? "",
    keywords: Array.isArray(planCard.keywords) ? planCard.keywords : [],
    completed: false,
    favorite: false,
    needReview: false,
    podcast: {
      status: "published",
      version: podcast.version ?? 1,
      title: podcast.title ?? planCard.title ?? content.title,
      duration: podcast.duration ?? null,
      audioUrl: podcast.audioUrl,
      transcriptUrl: podcast.transcriptUrl,
      sizeBytes: podcast.sizeBytes ?? null,
      checksum: podcast.checksum ?? null,
      updatedAt: podcast.updatedAt ?? now,
      archivedVersions: Array.isArray(podcast.archivedVersions) ? podcast.archivedVersions : [],
    },
    content,
  };
}

function buildManifestEntry(existingItem, planCard) {
  const podcast = planCard.podcast;

  return {
    ...(existingItem ?? {}),
    cardId: planCard.cardId,
    status: "published",
    version: podcast.version ?? 1,
    title: podcast.title ?? planCard.title,
    audioUrl: podcast.audioUrl,
    transcriptUrl: podcast.transcriptUrl,
    duration: podcast.duration ?? null,
    sizeBytes: podcast.sizeBytes ?? null,
    checksum: podcast.checksum ?? null,
  };
}

function isSamePodcastContent(left, right) {
  if (!left || !right) {
    return left === right;
  }

  const { updatedAt: _leftUpdatedAt, ...leftComparable } = left;
  const { updatedAt: _rightUpdatedAt, ...rightComparable } = right;
  return JSON.stringify(leftComparable) === JSON.stringify(rightComparable);
}

function mergePodcastIntoExistingCard(existingCard, planCard, now) {
  const nextPodcast = buildFormalCard(planCard, now).podcast;
  if (isSamePodcastContent(existingCard?.podcast, nextPodcast)) {
    return existingCard;
  }

  return {
    ...existingCard,
    podcast: nextPodcast,
  };
}

function buildUpdatedManifest(manifest, planCards) {
  const existingItems = Array.isArray(manifest.items) ? manifest.items : [];
  const publishedPodcastCards = planCards.filter((card) => card?.podcast?.status === "published");
  const keys = new Set(
    publishedPodcastCards.map((card) => `${card.cardId}::${card.podcast.version ?? 1}`),
  );
  const existingByKey = new Map(
    existingItems.map((item) => [`${item?.cardId}::${item?.version}`, item]),
  );

  return {
    ...manifest,
    items: [
      ...existingItems.filter((item) => !keys.has(`${item?.cardId}::${item?.version}`)),
      ...publishedPodcastCards.map((card) =>
        buildManifestEntry(
          existingByKey.get(`${card.cardId}::${card.podcast.version ?? 1}`),
          card,
        ),
      ),
    ],
  };
}

async function verifyWrittenCards(projectRoot, planCards, cards) {
  for (const planCard of planCards) {
    const cardId = planCard.cardId;
    const card = cards.find((item) => item?.id === cardId);
    if (!card) {
      throw new Error(`Written card not found after data/cards.json write: ${cardId}`);
    }

    assertReadableCardText(card);
    if (card.imageUrl === planCard?.image?.publishedUrl) {
      await assertFileExists(publicUrlToFilePath(card.imageUrl, projectRoot), `image for ${cardId}`);
    }

    if (card?.podcast?.status === "published") {
      await assertFileExists(
        publicUrlToFilePath(card.podcast.audioUrl, projectRoot),
        `podcast audio for ${cardId}`,
      );
      await assertFileExists(
        publicUrlToFilePath(card.podcast.transcriptUrl, projectRoot),
        `podcast transcript for ${cardId}`,
      );
    }
  }
}

export async function runWeeklyContinue({
  projectRoot = process.cwd(),
  weekId,
  now = new Date().toISOString(),
} = {}) {
  if (!weekId) {
    throw new Error("weekId is required");
  }

  const safeWeekId = assertSafeWeekId(weekId);
  const paths = getWeeklyWorkspacePaths(projectRoot, safeWeekId);
  const weeklyPlan = await loadRequiredJson(paths.weeklyPlan, "weekly-plan.json");
  const cardsPath = path.join(projectRoot, "data", "cards.json");
  const manifestPath = path.join(projectRoot, "data", "podcast-manifest.json");
  const cardsState = await loadRequiredJsonWithText(cardsPath, "data/cards.json");
  const manifestState = await loadRequiredJsonWithText(manifestPath, "podcast-manifest.json");
  const currentCards = cardsState.value;
  const manifest = manifestState.value;

  assertCardsArray(weeklyPlan.cards, paths.weeklyPlan);
  assertCardsArray(currentCards, cardsPath);
  assertNoDuplicatePlanKeys(weeklyPlan.cards);

  for (const card of weeklyPlan.cards) {
    assertPlanCardReady(card);
    await assertPlanCardAssetsExist(projectRoot, card);
  }

  const existingIds = new Set(currentCards.map((card) => card?.id));
  const newPlanCards = weeklyPlan.cards.filter((card) => !existingIds.has(card.cardId));
  const newCards = newPlanCards.map((card) => buildFormalCard(card, now));
  for (const card of newCards) {
    assertReadableCardText(card);
  }

  const nextCards = currentCards.map((card) => {
    const matchingPlanCard = weeklyPlan.cards.find((planCard) => planCard.cardId === card?.id);
    if (!matchingPlanCard) {
      return card;
    }

    return mergePodcastIntoExistingCard(card, matchingPlanCard, now);
  });
  nextCards.push(...newCards);
  const nextCardsText = stableJsonText(nextCards);
  const updatedManifestCandidate = buildUpdatedManifest(manifest, weeklyPlan.cards);
  const manifestChanged = JSON.stringify(updatedManifestCandidate) !== JSON.stringify(manifest);
  const nextManifest = manifestChanged
    ? {
        ...updatedManifestCandidate,
        updatedAt: now,
      }
    : manifest;
  const nextManifestText = stableJsonText(nextManifest);

  if (manifestChanged) {
    await weeklyContinueInternals.writeTextFileAtomically(manifestPath, nextManifestText);
  }

  const cardsChanged = nextCardsText !== cardsState.text;
  let cardsWritten = false;
  if (cardsChanged) {
    try {
      await weeklyContinueInternals.writeTextFileAtomically(cardsPath, nextCardsText);
      cardsWritten = true;
    } catch (error) {
      if (manifestChanged) {
        await weeklyContinueInternals.writeTextFileAtomically(manifestPath, manifestState.text);
      }

      throw error;
    }
  }

  const writtenCards = cardsWritten ? await readJsonFile(cardsPath) : currentCards;
  assertCardsArray(writtenCards, cardsPath);
  await verifyWrittenCards(
    projectRoot,
    weeklyPlan.cards,
    writtenCards,
  );

  return {
    weekId: safeWeekId,
    appendedCount: newCards.length,
    skippedExistingCount: weeklyPlan.cards.length - newCards.length,
  };
}

async function runCli() {
  const weekId = process.argv[2];
  const result = await runWeeklyContinue({ weekId });
  console.log(
    `Continued ${result.weekId}: appended ${result.appendedCount}, skipped ${result.skippedExistingCount}`,
  );
}

const scriptEntryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptEntryPath) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
