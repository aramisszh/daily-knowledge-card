import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getWeeklyWorkspacePaths } from "./lib/weekly-paths.mjs";
import { readJsonFile } from "./lib/weekly-json.mjs";
import { createWeeklyPlan } from "./lib/weekly-plan.mjs";

function createNextStepMessage(weekDir) {
  return `Go to ChatGPT, use ${path.join(
    weekDir,
    "image2-prompts.md",
  )}, generate 7 images, and save them into ${path.join(weekDir, "images", "raw")}.`;
}

async function readExistingPlanIfPresent(filePath) {
  try {
    return await readJsonFile(filePath);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith(`Failed to read JSON file ${filePath}: ENOENT`)
    ) {
      return null;
    }

    throw error;
  }
}

function normalizePlanForComparison(plan) {
  if (!plan || typeof plan !== "object") {
    return plan;
  }

  const { createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = plan;
  return rest;
}

function resolveEffectivePlan(existingPlan, generatedPlan) {
  if (!existingPlan) {
    return generatedPlan;
  }

  if (
    JSON.stringify(normalizePlanForComparison(existingPlan)) !==
    JSON.stringify(normalizePlanForComparison(generatedPlan))
  ) {
    throw new Error("Existing weekly plan does not match generated cards");
  }

  return existingPlan;
}

async function writeTextFileIfChanged(filePath, content) {
  try {
    const existingContent = await readFile(filePath, "utf8");
    if (existingContent === content) {
      return;
    }
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !String(error.message).includes("ENOENT")
    ) {
      throw error;
    }
  }

  await writeFile(filePath, content, "utf8");
}

async function writeJsonFileIfChanged(filePath, value) {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  await writeTextFileIfChanged(filePath, content);
}

function renderImagePrompt(card) {
  return [
    `## ${card.title}`,
    `cardId: ${card.cardId}`,
    `title: ${card.title}`,
    `category: ${card.category}`,
    "size: 4:5 vertical poster, mobile-friendly",
    `必须包含的文字：主标题《${card.title}》；副标题《${card.subtitle}》；类别《${card.category}》`,
    "版面结构：顶部标题区，中部核心机制信息图，底部 3 个要点区，整体高信息密度、清晰留白、现代知识卡风格。",
    "禁止事项：不要照片拼贴，不要人物写实肖像，不要英文大段正文，不要低对比度，不要水印，不要额外品牌标识。",
    `保存文件名：${card.cardId}.png`,
    "",
  ].join("\n");
}

function renderImagePrompts(plan, weekDir) {
  return [
    `# Weekly Image2 Prompts`,
    ``,
    `weekId: ${plan.weekId}`,
    `workspace: ${weekDir}`,
    `next step: generate 7 images in ChatGPT and save them into ${path.join(
      weekDir,
      "images",
      "raw",
    )}`,
    ``,
    ...plan.cards.map(renderImagePrompt),
  ].join("\n");
}

function buildPodcastDialogue(card) {
  const firstQuestion =
    card.content.thinkingQuestions[0]?.question ?? `这张卡片最关键的一点是什么？`;
  const firstKeyPoint =
    card.content.thinkingQuestions[0]?.keyPoint ?? card.summary;

  return [
    { speaker: "B", text: `今天这张卡讲的是《${card.title}》。我最先想问，${firstQuestion}` },
    { speaker: "A", text: `${card.summary}。先抓住结论：${card.content.conclusion}` },
    { speaker: "B", text: `那它背后的核心机制到底是什么？` },
    { speaker: "A", text: `${card.content.coreMechanism}` },
    {
      speaker: "B",
      text: `如果只记住三个点，应该优先记什么？`,
    },
    {
      speaker: "A",
      text: card.content.whyImportant
        .slice(0, 3)
        .map((item, index) => `第${index + 1}点，${item}`)
        .join("；"),
    },
    { speaker: "B", text: `很多人容易搞错什么？` },
    {
      speaker: "A",
      text: `${card.content.misconception.title}：${card.content.misconception.content}。从财务或经营视角看，${card.content.financeAngle}`,
    },
    { speaker: "B", text: `最后帮我用一句容易记住的话收尾。` },
    {
      speaker: "A",
      text: `${firstKeyPoint}。再记一句：${card.content.conclusion}`,
    },
  ];
}

function renderPodcastScriptMarkdown(card) {
  const dialogue = buildPodcastDialogue(card);

  return [
    `# ${card.title}`,
    ``,
    `- cardId: ${card.cardId}`,
    `- 目标时长: 180 秒`,
    `- 风格: 双人对话式科普`,
    `- A：知识讲解者，负责解释概念、机制、案例和误区。`,
    `- B：普通学习者，负责提出普通人会问的问题。`,
    ``,
    `## Script`,
    ...dialogue.map((line) => `${line.speaker}：${line.text}`),
    ``,
  ].join("\n");
}

function formatSrtTimestamp(totalSeconds) {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds},000`;
}

function renderPodcastScriptSrt(card) {
  const dialogue = buildPodcastDialogue(card);
  const segmentLengthSec = Math.floor(180 / dialogue.length);

  return dialogue
    .map((line, index) => {
      const start = index * segmentLengthSec;
      const end = index === dialogue.length - 1 ? 180 : (index + 1) * segmentLengthSec;

      return [
        String(index + 1),
        `${formatSrtTimestamp(start)} --> ${formatSrtTimestamp(end)}`,
        `${line.speaker}：${line.text}`,
        ``,
      ].join("\n");
    })
    .join("\n");
}

function createPodcastMeta(card, createdAt) {
  return {
    cardId: card.cardId,
    podcastVersion: 1,
    title: card.title,
    targetDurationSec: 180,
    language: "zh-CN",
    style: "双人对话式科普",
    speakerA: "host-a",
    speakerB: "host-b",
    status: "pending",
    createdAt,
  };
}

function renderWindowsHandoff(plan, paths) {
  const windowsTarget = `D:\\AI-Podcast\\jobs\\pending\\${plan.weekId}`;

  return [
    `# Windows Handoff`,
    ``,
    `weekId: ${plan.weekId}`,
    `copy source: ${paths.pendingPodcastDir}`,
    `windows target: ${windowsTarget}`,
    ``,
    `Copy the entire pending folder contents to the Windows target path before starting TTS generation.`,
    `Each card package must include script.md, script.srt, and podcast.meta.json.`,
    ``,
  ].join("\n");
}

function renderMacRunLog(plan, weekDir) {
  return [
    `# Mac Run Log`,
    ``,
    `command: weekly:create`,
    `weekId: ${plan.weekId}`,
    `createdAt: ${plan.createdAt}`,
    `workspace: ${weekDir}`,
    `nextStep: ${createNextStepMessage(weekDir)}`,
    ``,
  ].join("\n");
}

async function writePodcastPackages(plan, paths) {
  await mkdir(paths.pendingPodcastDir, { recursive: true });
  await mkdir(paths.donePodcastDir, { recursive: true });
  await mkdir(paths.failedPodcastDir, { recursive: true });

  await Promise.all(
    plan.cards.map(async (card) => {
      const packageDir = path.join(paths.pendingPodcastDir, card.cardId);
      await mkdir(packageDir, { recursive: true });
      await writeTextFileIfChanged(
        path.join(packageDir, "script.md"),
        renderPodcastScriptMarkdown(card),
      );
      await writeTextFileIfChanged(
        path.join(packageDir, "script.srt"),
        renderPodcastScriptSrt(card),
      );
      await writeJsonFileIfChanged(
        path.join(packageDir, "podcast.meta.json"),
        createPodcastMeta(card, plan.createdAt),
      );
    }),
  );
}

export async function runWeeklyCreate({ projectRoot = process.cwd(), now } = {}) {
  const cardsPath = path.join(projectRoot, "data", "cards.json");
  const cards = await readJsonFile(cardsPath);
  const generatedPlan = createWeeklyPlan(cards, { now });
  const paths = getWeeklyWorkspacePaths(projectRoot, generatedPlan.weekId);

  const existingPlan = await readExistingPlanIfPresent(paths.weeklyPlan);
  const effectivePlan = resolveEffectivePlan(existingPlan, generatedPlan);

  await mkdir(paths.rawImagesDir, { recursive: true });
  await mkdir(paths.donePodcastDir, { recursive: true });
  await mkdir(paths.failedPodcastDir, { recursive: true });

  await writeJsonFileIfChanged(paths.weeklyPlan, effectivePlan);
  await writeTextFileIfChanged(
    paths.image2Prompts,
    renderImagePrompts(effectivePlan, paths.weekDir),
  );
  await writeTextFileIfChanged(paths.macRunLog, renderMacRunLog(effectivePlan, paths.weekDir));
  await writeTextFileIfChanged(
    paths.handoffToWindows,
    renderWindowsHandoff(effectivePlan, paths),
  );
  await writePodcastPackages(effectivePlan, paths);

  return {
    weekId: effectivePlan.weekId,
    weekDir: paths.weekDir,
    nextStep: createNextStepMessage(paths.weekDir),
  };
}

async function runCli() {
  const result = await runWeeklyCreate();
  console.log(`Week ID: ${result.weekId}`);
  console.log(`Next step: ${result.nextStep}`);
}

const entryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === entryPath) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
