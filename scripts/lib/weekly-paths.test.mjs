import { describe, expect, it } from "vitest";
import {
  assertSafeWeekId,
  getWeeklyWorkspacePaths,
  publicUrlToFilePath,
} from "./weekly-paths.mjs";

describe("assertSafeWeekId", () => {
  it("accepts the project week id format", () => {
    expect(assertSafeWeekId("2026-05-28_to_2026-06-03")).toBe("2026-05-28_to_2026-06-03");
  });

  it("rejects traversal and shell-like input", () => {
    expect(() => assertSafeWeekId("../bad")).toThrow("Invalid weekId");
    expect(() => assertSafeWeekId("2026-05-28;rm")).toThrow("Invalid weekId");
  });
});

describe("getWeeklyWorkspacePaths", () => {
  it("returns every required weekly workspace path", () => {
    const paths = getWeeklyWorkspacePaths("/repo", "2026-05-28_to_2026-06-03");

    expect(paths.weekDir).toBe("/repo/automation/weekly/2026-05-28_to_2026-06-03");
    expect(paths.weeklyPlan).toBe("/repo/automation/weekly/2026-05-28_to_2026-06-03/weekly-plan.json");
    expect(paths.image2Prompts).toBe("/repo/automation/weekly/2026-05-28_to_2026-06-03/image2-prompts.md");
    expect(paths.macRunLog).toBe("/repo/automation/weekly/2026-05-28_to_2026-06-03/mac-run-log.md");
    expect(paths.handoffToWindows).toBe("/repo/automation/weekly/2026-05-28_to_2026-06-03/handoff-to-windows.md");
    expect(paths.rawImagesDir).toBe("/repo/automation/weekly/2026-05-28_to_2026-06-03/images/raw");
    expect(paths.pendingPodcastDir).toBe("/repo/automation/weekly/2026-05-28_to_2026-06-03/podcast_jobs/pending");
    expect(paths.donePodcastDir).toBe("/repo/automation/weekly/2026-05-28_to_2026-06-03/podcast_jobs/done");
    expect(paths.failedPodcastDir).toBe("/repo/automation/weekly/2026-05-28_to_2026-06-03/podcast_jobs/failed");
  });
});

describe("publicUrlToFilePath", () => {
  it("maps public URLs back to files under public", () => {
    expect(publicUrlToFilePath("/audio/published/a.mp3", "/repo")).toBe("/repo/public/audio/published/a.mp3");
  });

  it("rejects non-root-relative or external URLs", () => {
    expect(() => publicUrlToFilePath("https://example.com/a.mp3", "/repo")).toThrow(
      "Only root-relative public URLs are supported",
    );
    expect(() => publicUrlToFilePath("audio/published/a.mp3", "/repo")).toThrow(
      "Only root-relative public URLs are supported",
    );
    expect(() => publicUrlToFilePath("//example.com/a.mp3", "/repo")).toThrow(
      "Only root-relative public URLs are supported",
    );
    expect(() => publicUrlToFilePath("/../secret.txt", "/repo")).toThrow(
      "Only root-relative public URLs are supported",
    );
    expect(() => publicUrlToFilePath("/C:/secret.txt", "/repo")).toThrow(
      "Only root-relative public URLs are supported",
    );
  });
});
