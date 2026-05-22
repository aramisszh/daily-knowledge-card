import path from "node:path";

const WEEK_ID_PATTERN = /^\d{4}-\d{2}-\d{2}_to_\d{4}-\d{2}-\d{2}$/;
const ROOT_RELATIVE_PUBLIC_URL_ERROR = "Only root-relative public URLs are supported";

export function assertSafeWeekId(weekId) {
  if (typeof weekId !== "string" || !WEEK_ID_PATTERN.test(weekId)) {
    throw new Error(`Invalid weekId: ${weekId}`);
  }

  return weekId;
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
