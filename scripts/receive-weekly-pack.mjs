import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  access,
  copyFile,
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readJsonFile, writeJsonFileStable } from "./lib/weekly-json.mjs";
import {
  assertSafeIncomingWeekKey,
  getExchangeWeeklyPackPaths,
  getWeeklyExchangeWorkspacePaths,
} from "./lib/weekly-paths.mjs";

const execFileAsync = promisify(execFile);

function isMissingError(error) {
  return error && typeof error === "object" && "code" in error && error.code === "ENOENT";
}

async function assertPathExists(targetPath, label) {
  try {
    await access(targetPath);
  } catch (error) {
    if (isMissingError(error)) {
      throw new Error(`${label} not found: ${targetPath}`);
    }

    throw error;
  }
}

async function assertFileExists(targetPath, label) {
  try {
    const fileStat = await stat(targetPath);
    if (!fileStat.isFile()) {
      throw new Error(`${label} is not a file: ${targetPath}`);
    }
  } catch (error) {
    if (isMissingError(error)) {
      throw new Error(`${label} not found: ${targetPath}`);
    }

    throw error;
  }
}

async function readRequiredJson(filePath, label) {
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

async function readRequiredText(filePath, label) {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (isMissingError(error)) {
      throw new Error(`${label} not found: ${filePath}`);
    }

    throw error;
  }
}

function assertRequiredString(value, label, cardId = "<unknown>") {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Card ${cardId} missing required field ${label}`);
  }
}

function assertRequiredArray(value, label, cardId = "<unknown>") {
  if (!Array.isArray(value)) {
    throw new Error(`Card ${cardId} missing required field ${label}`);
  }
}

function assertRequiredObject(value, label, cardId = "<unknown>") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Card ${cardId} missing required field ${label}`);
  }
}

function normalizeKeywordObjects(values = []) {
  return values.map((item) => {
    if (typeof item === "string") {
      return { term: item, desc: item };
    }

    if (item && typeof item === "object") {
      return {
        term: typeof item.term === "string" ? item.term : item.heading ?? "关键词",
        desc: typeof item.desc === "string" ? item.desc : item.body ?? item.term ?? "关键词说明",
      };
    }

    return { term: "关键词", desc: "关键词说明" };
  });
}

function normalizeThinkingQuestions(card) {
  if (Array.isArray(card?.content?.thinkingQuestions) && card.content.thinkingQuestions.length > 0) {
    return card.content.thinkingQuestions;
  }

  if (Array.isArray(card?.thoughtQuestions) && card.thoughtQuestions.length > 0) {
    return card.thoughtQuestions.map((item) => ({
      level: "思考题",
      question: item.question,
      answer: item.answer,
      keyPoint: item.answer,
    }));
  }

  return [
    {
      level: "思考题",
      question: "这个知识点最容易被误解的地方是什么？",
      answer: card.summary,
      keyPoint: card.summary,
    },
  ];
}

function buildNormalizedContent(card) {
  const existing = card?.content;
  const content = {
    title: card.title ?? existing?.title ?? "",
    subtitle: card.subtitle ?? existing?.subtitle ?? "",
    category: card.category ?? existing?.category ?? "",
    subCategory: card.subCategory ?? existing?.subCategory ?? "未分类",
    difficulty: card.difficulty ?? existing?.difficulty ?? "入门",
    summary: card.summary ?? existing?.summary ?? "",
    coreMechanism:
      existing?.coreMechanism ??
      card.oneSentence ??
      card.contentBlocks?.[0]?.body ??
      card.summary ??
      "",
    whyImportant:
      existing?.whyImportant ??
      (Array.isArray(card.coreConcepts) && card.coreConcepts.length > 0
        ? card.coreConcepts
        : [card.summary ?? ""]),
    keywords:
      existing?.keywords ??
      normalizeKeywordObjects(
        Array.isArray(card.keywords) && card.keywords.length > 0
          ? card.keywords
          : card.coreConcepts ?? [],
      ),
    misconception:
      existing?.misconception ?? {
        title: "常见误区",
        content: card.thoughtQuestions?.[0]?.answer ?? card.summary ?? "",
      },
    financeAngle:
      existing?.financeAngle ?? card.financeAngle ?? card.podcastAngle ?? "从生活场景理解这个机制。",
    memoryHooks:
      existing?.memoryHooks ??
      (Array.isArray(card.coreConcepts) && card.coreConcepts.length > 0
        ? card.coreConcepts.slice(0, 3)
        : [card.title ?? ""]),
    thinkingQuestions: normalizeThinkingQuestions(card),
    conclusion:
      existing?.conclusion ?? card.oneSentence ?? card.summary ?? card.podcastAngle ?? "",
  };

  assertRequiredString(content.title, "content.title", card.cardId);
  assertRequiredString(content.subtitle, "content.subtitle", card.cardId);
  assertRequiredString(content.category, "content.category", card.cardId);
  assertRequiredString(content.subCategory, "content.subCategory", card.cardId);
  assertRequiredString(content.difficulty, "content.difficulty", card.cardId);
  assertRequiredString(content.summary, "content.summary", card.cardId);
  assertRequiredString(content.coreMechanism, "content.coreMechanism", card.cardId);
  assertRequiredArray(content.whyImportant, "content.whyImportant", card.cardId);
  assertRequiredArray(content.keywords, "content.keywords", card.cardId);
  assertRequiredObject(content.misconception, "content.misconception", card.cardId);
  assertRequiredString(content.misconception.title, "content.misconception.title", card.cardId);
  assertRequiredString(content.misconception.content, "content.misconception.content", card.cardId);
  assertRequiredString(content.financeAngle, "content.financeAngle", card.cardId);
  assertRequiredArray(content.memoryHooks, "content.memoryHooks", card.cardId);
  assertRequiredArray(content.thinkingQuestions, "content.thinkingQuestions", card.cardId);
  assertRequiredString(content.conclusion, "content.conclusion", card.cardId);

  return content;
}

function normalizeCardsDraftItems(cardsDraft, cardsDraftPath) {
  if (Array.isArray(cardsDraft)) {
    return cardsDraft;
  }

  if (cardsDraft && typeof cardsDraft === "object" && Array.isArray(cardsDraft.items)) {
    return cardsDraft.items;
  }

  throw new Error(`Expected cards-draft.json to contain an array or { items }: ${cardsDraftPath}`);
}

function basenameOrNull(value) {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  return path.basename(value);
}

function buildImageSourceFileName(draftCard, weeklyPlanCard, cardId) {
  return (
    basenameOrNull(draftCard?.image?.fileName) ??
    basenameOrNull(draftCard?.image?.path) ??
    basenameOrNull(weeklyPlanCard?.imageFile) ??
    `${cardId}.png`
  );
}

function normalizeDraftCard(draftCard, meta, weeklyPlanCard) {
  const cardId = draftCard.cardId ?? draftCard.id;
  const podcastVersion = Number.isInteger(meta.podcastVersion) && meta.podcastVersion > 0
    ? meta.podcastVersion
    : 1;
  const content = buildNormalizedContent({
    ...draftCard,
    cardId,
  });

  const topLevelKeywords = Array.isArray(draftCard.keywords)
    ? draftCard.keywords
    : Array.isArray(draftCard.coreConcepts)
      ? draftCard.coreConcepts
      : content.keywords.map((item) => item.term);

  return {
    cardId,
    cardDate: draftCard.cardDate ?? draftCard.date,
    title: draftCard.title,
    subtitle: draftCard.subtitle ?? content.subtitle,
    category: draftCard.category ?? content.category,
    subCategory: draftCard.subCategory ?? content.subCategory,
    difficulty: draftCard.difficulty ?? content.difficulty,
    summary: draftCard.summary ?? content.summary,
    keywords: topLevelKeywords,
    content,
    image: {
      status: "pending",
      sourceFileName: buildImageSourceFileName(draftCard, weeklyPlanCard, cardId),
      publishedUrl: null,
      sizeBytes: null,
      checksum: null,
    },
    podcast: {
      status: "ready",
      version: podcastVersion,
      title: meta.title,
      targetDurationSec:
        meta.targetDurationSec ??
        meta.durationTargetSeconds?.estimated ??
        draftCard?.podcast?.targetDurationSec ??
        null,
      audioUrl: null,
      transcriptUrl: null,
      duration: meta.duration ?? null,
      sizeBytes: null,
      checksum: null,
    },
  };
}

async function findIncomingZipPath(inboxDir, weekKey) {
  await assertPathExists(inboxDir, "exchange inbox directory");
  const entries = await readdir(inboxDir);
  const matches = entries.filter((entry) => entry.startsWith(`dkc-handoff__${weekKey}__`) && entry.endsWith(".zip"));

  if (matches.length === 0) {
    throw new Error(`No handoff zip found for ${weekKey} in ${inboxDir}`);
  }
  if (matches.length > 1) {
    throw new Error(`Multiple handoff zips found for ${weekKey} in ${inboxDir}`);
  }

  return path.join(inboxDir, matches[0]);
}

async function unzipIntoDirectory(zipPath, targetDir) {
  await rm(targetDir, { recursive: true, force: true });
  await mkdir(targetDir, { recursive: true });
  await execFileAsync("unzip", ["-q", zipPath, "-d", targetDir]);
}

async function resolveImageAssetsDir(sourceDir) {
  const candidates = [
    path.join(sourceDir, "image-assets"),
    path.join(sourceDir, "images", "raw"),
  ];

  for (const candidate of candidates) {
    try {
      const candidateStat = await stat(candidate);
      if (candidateStat.isDirectory()) {
        return candidate;
      }
    } catch (error) {
      if (!isMissingError(error)) throw error;
    }
  }

  throw new Error(`image-assets directory not found: ${path.join(sourceDir, "image-assets")}`);
}

async function moveZipToDirectory(zipPath, destinationDir) {
  await mkdir(destinationDir, { recursive: true });
  const destinationPath = path.join(destinationDir, path.basename(zipPath));
  await rename(zipPath, destinationPath);
  return destinationPath;
}

async function copyWorkspaceSource(stagingDir, workspacePaths) {
  await rm(workspacePaths.sourceDir, { recursive: true, force: true });
  await mkdir(workspacePaths.weekDir, { recursive: true });
  await cp(stagingDir, workspacePaths.sourceDir, { recursive: true });
  await mkdir(workspacePaths.outboxDir, { recursive: true });
  await mkdir(workspacePaths.reportsDir, { recursive: true });
  await mkdir(workspacePaths.logsDir, { recursive: true });
}

async function writeMacRunLog(filePath, lines) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${lines.join("\n")}\n`, "utf8");
}

export async function runReceiveWeeklyPack({
  projectRoot = process.cwd(),
  weekKey,
} = {}) {
  if (!weekKey) {
    throw new Error("weekKey is required");
  }

  const safeWeekKey = assertSafeIncomingWeekKey(weekKey);
  const exchangePaths = getExchangeWeeklyPackPaths(projectRoot, safeWeekKey);
  const workspacePaths = getWeeklyExchangeWorkspacePaths(projectRoot, safeWeekKey);
  const zipPath = await findIncomingZipPath(exchangePaths.inboxDir, safeWeekKey);

  try {
    await unzipIntoDirectory(zipPath, exchangePaths.stagingDir);
    await copyWorkspaceSource(exchangePaths.stagingDir, workspacePaths);

    await assertFileExists(workspacePaths.weeklyPlan, "weekly-plan.json");
    await assertFileExists(workspacePaths.cardsDraft, "cards-draft.json");
    await assertFileExists(workspacePaths.packageManifest, "package-manifest.json");
    await assertPathExists(workspacePaths.donePodcastDir, "podcast done directory");

    const imageAssetsDir = await resolveImageAssetsDir(workspacePaths.sourceDir);
    const sourceWeeklyPlan = await readRequiredJson(workspacePaths.weeklyPlan, "weekly-plan.json");
    const cardsDraft = await readRequiredJson(workspacePaths.cardsDraft, "cards-draft.json");
    const draftItems = normalizeCardsDraftItems(cardsDraft, workspacePaths.cardsDraft);
    const weeklyPlanCards = Array.isArray(sourceWeeklyPlan.cards) ? sourceWeeklyPlan.cards : [];
    const weeklyPlanCardById = new Map(
      weeklyPlanCards.map((card) => [card.cardId, card]),
    );

    const normalizedCards = await Promise.all(
      draftItems.map(async (draftCard) => {
        const cardId = draftCard.cardId ?? draftCard.id;
        assertRequiredString(cardId, "id");
        assertRequiredString(draftCard.cardDate ?? draftCard.date, "cardDate", cardId);
        assertRequiredString(draftCard.title, "title", cardId);
        assertRequiredString(draftCard.category, "category", cardId);
        assertRequiredString(draftCard.summary, "summary", cardId);

        const weeklyPlanCard = weeklyPlanCardById.get(cardId);
        const imageFileName = buildImageSourceFileName(draftCard, weeklyPlanCard, cardId);
        const imagePath = path.join(imageAssetsDir, imageFileName);
        const doneDir = path.join(workspacePaths.donePodcastDir, cardId);
        const metaPath = path.join(doneDir, "podcast.meta.json");
        const transcriptPath = path.join(doneDir, "transcript.md");

        await assertFileExists(imagePath, `Missing image asset for ${cardId}`);
        await assertPathExists(doneDir, `done podcast package for ${cardId}`);
        const meta = await readRequiredJson(metaPath, "podcast.meta.json");
        await readRequiredText(transcriptPath, "transcript.md");

        assertRequiredString(meta.cardId, "podcast.meta.json.cardId", cardId);
        if (meta.cardId !== cardId) {
          throw new Error(`podcast.meta.json cardId mismatch for ${cardId}`);
        }
        assertRequiredString(meta.title, "podcast.meta.json.title", cardId);

        await assertFileExists(
          path.join(
            doneDir,
            `${cardId}-podcast-v${
              Number.isInteger(meta.podcastVersion) && meta.podcastVersion > 0
                ? meta.podcastVersion
                : 1
            }.mp3`,
          ),
          `source audio for ${cardId}`,
        );

        return normalizeDraftCard(draftCard, meta, weeklyPlanCard);
      }),
    );

    const normalizedPlan = {
      ...sourceWeeklyPlan,
      workflowMode: "exchange-handoff",
      weekKey: safeWeekKey,
      status: "received",
      cardCount: normalizedCards.length,
      cards: normalizedCards,
    };

    await writeJsonFileStable(workspacePaths.weeklyPlan, normalizedPlan);

    const sourceWindowsAudioReport = path.join(workspacePaths.sourceDir, "windows-audio-report.json");
    try {
      await assertFileExists(sourceWindowsAudioReport, "windows-audio-report.json");
      await copyFile(sourceWindowsAudioReport, workspacePaths.ttsOutputReport);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("windows-audio-report.json")) {
        throw error;
      }
    }

    await mkdir(workspacePaths.pendingPodcastDir, { recursive: true });
    await writeMacRunLog(workspacePaths.macRunLog, [
      `weekKey: ${safeWeekKey}`,
      `sourceZip: ${path.basename(zipPath)}`,
      `cardCount: ${normalizedCards.length}`,
      `status: received`,
    ]);

    await moveZipToDirectory(zipPath, exchangePaths.processedDir);

    return {
      weekKey: safeWeekKey,
      cardCount: normalizedCards.length,
    };
  } catch (error) {
    try {
      await moveZipToDirectory(zipPath, exchangePaths.failedDir);
    } catch {
      // Keep the original failure as the main signal.
    }
    throw error;
  }
}

async function runCli() {
  const weekKey = process.argv[2];
  const result = await runReceiveWeeklyPack({ weekKey });
  console.log(`Received ${result.cardCount} cards for ${result.weekKey}`);
}

const scriptEntryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptEntryPath) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
