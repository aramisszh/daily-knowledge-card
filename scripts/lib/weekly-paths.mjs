import path from "node:path";

const WEEK_ID_PATTERN = /^\d{4}-\d{2}-\d{2}_to_\d{4}-\d{2}-\d{2}$/;
const INCOMING_WEEK_KEY_PATTERN = /^\d{4}-W\d{2}$/;
const ROOT_RELATIVE_PUBLIC_URL_ERROR = "Only root-relative public URLs are supported";

export function assertSafeWeekId(weekId) {
  if (typeof weekId !== "string" || !WEEK_ID_PATTERN.test(weekId)) {
    throw new Error(`Invalid weekId: ${weekId}`);
  }

  return weekId;
}

export function assertSafeIncomingWeekKey(weekKey) {
  if (typeof weekKey !== "string" || !INCOMING_WEEK_KEY_PATTERN.test(weekKey)) {
    throw new Error(`Invalid incoming weekKey: ${weekKey}`);
  }

  return weekKey;
}

export function getWeeklyWorkspacePaths(projectRoot, weekId) {
  const safeWeekId = assertSafeWeekId(weekId);
  const weekDir = path.join(projectRoot, "automation", "weekly", safeWeekId);

  return {
    weekDir,
    weeklyPlan: path.join(weekDir, "weekly-plan.json"),
    image2Prompts: path.join(weekDir, "image2-prompts.md"),
    macRunLog: path.join(weekDir, "mac-run-log.md"),
    handoffToWindows: path.join(weekDir, "handoff-to-windows.md"),
    rawImagesDir: path.join(weekDir, "images", "raw"),
    pendingPodcastDir: path.join(weekDir, "podcast_jobs", "pending"),
    donePodcastDir: path.join(weekDir, "podcast_jobs", "done"),
    failedPodcastDir: path.join(weekDir, "podcast_jobs", "failed"),
  };
}

export function getLegacyIncomingWeeklyPackPaths(projectRoot, weekKey) {
  const safeWeekKey = assertSafeIncomingWeekKey(weekKey);
  const weekDir = path.join(projectRoot, "automation", "incoming", safeWeekKey);

  return {
    weekDir,
    weeklyPlan: path.join(weekDir, "weekly-plan.json"),
    cardsDraft: path.join(weekDir, "cards-draft.json"),
    imageAssetsDir: path.join(weekDir, "image-assets"),
    pendingPodcastDir: path.join(weekDir, "podcast_jobs", "pending"),
    donePodcastDir: path.join(weekDir, "podcast_jobs", "done"),
    failedPodcastDir: path.join(weekDir, "podcast_jobs", "failed"),
  };
}

export function getExchangeWeeklyPackPaths(projectRoot, weekKey) {
  const safeWeekKey = assertSafeIncomingWeekKey(weekKey);
  const exchangeDir = path.join(projectRoot, "automation", "exchange");

  return {
    exchangeDir,
    inboxDir: path.join(exchangeDir, "inbox"),
    stagingDir: path.join(exchangeDir, "staging", safeWeekKey),
    processedDir: path.join(exchangeDir, "processed"),
    failedDir: path.join(exchangeDir, "failed"),
  };
}

export function getWeeklyExchangeWorkspacePaths(projectRoot, weekKey) {
  const safeWeekKey = assertSafeIncomingWeekKey(weekKey);
  const weekDir = path.join(projectRoot, "automation", "weekly", safeWeekKey);
  const sourceDir = path.join(weekDir, "source");
  const outboxDir = path.join(weekDir, "outbox");
  const reportsDir = path.join(weekDir, "reports");
  const logsDir = path.join(weekDir, "logs");

  return {
    weekDir,
    sourceDir,
    outboxDir,
    reportsDir,
    logsDir,
    weeklyPlan: path.join(sourceDir, "weekly-plan.json"),
    cardsDraft: path.join(sourceDir, "cards-draft.json"),
    packageManifest: path.join(sourceDir, "package-manifest.json"),
    imageAssetsDir: path.join(sourceDir, "image-assets"),
    rawImagesDir: path.join(sourceDir, "images", "raw"),
    pendingPodcastDir: path.join(sourceDir, "podcast_jobs", "pending"),
    donePodcastDir: path.join(sourceDir, "podcast_jobs", "done"),
    failedPodcastDir: path.join(sourceDir, "podcast_jobs", "failed"),
    ttsOutputReport: path.join(outboxDir, "tts-output-report.json"),
    windowsOutboxManifest: path.join(outboxDir, "windows-outbox-manifest.json"),
    macImportReport: path.join(reportsDir, "mac-import-report.md"),
    validationReport: path.join(reportsDir, "validation-report.json"),
    macRunLog: path.join(logsDir, "mac-run-log.md"),
  };
}

export function getIncomingWeeklyArchivePaths(projectRoot, weekKey) {
  const safeWeekKey = assertSafeIncomingWeekKey(weekKey);
  const weekDir = path.join(projectRoot, "automation", "archive", safeWeekKey);

  return {
    weekDir,
  };
}

export function publicUrlToFilePath(publicUrl, projectRoot) {
  if (
    typeof publicUrl !== "string" ||
    !publicUrl.startsWith("/") ||
    publicUrl.startsWith("//")
  ) {
    throw new Error(ROOT_RELATIVE_PUBLIC_URL_ERROR);
  }

  const publicRoot = path.resolve(projectRoot, "public");
  const relativePath = publicUrl.slice(1);
  const filePath = path.resolve(publicRoot, relativePath);

  const relativePathFromPublic = path.relative(publicRoot, filePath);

  if (
    relativePathFromPublic.startsWith("..") ||
    path.isAbsolute(relativePathFromPublic) ||
    /^[a-zA-Z]:/.test(relativePathFromPublic)
  ) {
    throw new Error(ROOT_RELATIVE_PUBLIC_URL_ERROR);
  }

  return filePath;
}
