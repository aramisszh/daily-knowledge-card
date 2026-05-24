import { describe, expect, it } from "vitest";
import {
  assertSafeWeekId,
  assertSafeIncomingWeekKey,
  getExchangeWeeklyPackPaths,
  getIncomingWeeklyArchivePaths,
  getLegacyIncomingWeeklyPackPaths,
  getWeeklyExchangeWorkspacePaths,
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

describe("assertSafeIncomingWeekKey", () => {
  it("accepts the incoming weekly pack key format", () => {
    expect(assertSafeIncomingWeekKey("2026-W22")).toBe("2026-W22");
  });

  it("rejects traversal and malformed input", () => {
    expect(() => assertSafeIncomingWeekKey("../bad")).toThrow("Invalid incoming weekKey");
    expect(() => assertSafeIncomingWeekKey("2026-05-22")).toThrow("Invalid incoming weekKey");
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

describe("getLegacyIncomingWeeklyPackPaths", () => {
  it("returns every required legacy incoming weekly pack path", () => {
    const paths = getLegacyIncomingWeeklyPackPaths("/repo", "2026-W22");

    expect(paths.weekDir).toBe("/repo/automation/incoming/2026-W22");
    expect(paths.weeklyPlan).toBe("/repo/automation/incoming/2026-W22/weekly-plan.json");
    expect(paths.cardsDraft).toBe("/repo/automation/incoming/2026-W22/cards-draft.json");
    expect(paths.imageAssetsDir).toBe("/repo/automation/incoming/2026-W22/image-assets");
    expect(paths.pendingPodcastDir).toBe("/repo/automation/incoming/2026-W22/podcast_jobs/pending");
    expect(paths.donePodcastDir).toBe("/repo/automation/incoming/2026-W22/podcast_jobs/done");
    expect(paths.failedPodcastDir).toBe("/repo/automation/incoming/2026-W22/podcast_jobs/failed");
  });
});

describe("getExchangeWeeklyPackPaths", () => {
  it("returns inbox, staging, processed, and failed paths for exchange zips", () => {
    const paths = getExchangeWeeklyPackPaths("/repo", "2026-W22");

    expect(paths.inboxDir).toBe("/repo/automation/exchange/inbox");
    expect(paths.stagingDir).toBe("/repo/automation/exchange/staging/2026-W22");
    expect(paths.processedDir).toBe("/repo/automation/exchange/processed");
    expect(paths.failedDir).toBe("/repo/automation/exchange/failed");
  });
});

describe("getWeeklyExchangeWorkspacePaths", () => {
  it("returns the normalized weekly workspace paths for the new exchange workflow", () => {
    const paths = getWeeklyExchangeWorkspacePaths("/repo", "2026-W22");

    expect(paths.weekDir).toBe("/repo/automation/weekly/2026-W22");
    expect(paths.sourceDir).toBe("/repo/automation/weekly/2026-W22/source");
    expect(paths.outboxDir).toBe("/repo/automation/weekly/2026-W22/outbox");
    expect(paths.reportsDir).toBe("/repo/automation/weekly/2026-W22/reports");
    expect(paths.logsDir).toBe("/repo/automation/weekly/2026-W22/logs");
    expect(paths.weeklyPlan).toBe("/repo/automation/weekly/2026-W22/source/weekly-plan.json");
    expect(paths.cardsDraft).toBe("/repo/automation/weekly/2026-W22/source/cards-draft.json");
    expect(paths.packageManifest).toBe("/repo/automation/weekly/2026-W22/source/package-manifest.json");
    expect(paths.imageAssetsDir).toBe("/repo/automation/weekly/2026-W22/source/image-assets");
    expect(paths.rawImagesDir).toBe("/repo/automation/weekly/2026-W22/source/images/raw");
    expect(paths.donePodcastDir).toBe("/repo/automation/weekly/2026-W22/source/podcast_jobs/done");
    expect(paths.ttsOutputReport).toBe("/repo/automation/weekly/2026-W22/outbox/tts-output-report.json");
    expect(paths.macImportReport).toBe("/repo/automation/weekly/2026-W22/reports/mac-import-report.md");
    expect(paths.validationReport).toBe("/repo/automation/weekly/2026-W22/reports/validation-report.json");
    expect(paths.macRunLog).toBe("/repo/automation/weekly/2026-W22/logs/mac-run-log.md");
  });
});

describe("getIncomingWeeklyArchivePaths", () => {
  it("returns every required incoming weekly archive path", () => {
    const paths = getIncomingWeeklyArchivePaths("/repo", "2026-W22");

    expect(paths.weekDir).toBe("/repo/automation/archive/2026-W22");
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
