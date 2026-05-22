import { describe, expect, it } from "vitest";
import { getPodcastDisplayState } from "./podcast";
import type { PodcastInfo } from "@/types/knowledge";

describe("getPodcastDisplayState", () => {
  it("hides podcast UI when a card has no podcast field", () => {
    expect(getPodcastDisplayState(undefined)).toEqual({ kind: "hidden" });
  });

  it("shows the player only for published podcasts", () => {
    const podcast: PodcastInfo = {
      status: "published",
      version: 1,
      title: "Mock AI 播客",
      duration: 180,
      audioUrl: "/audio/published/mock-podcast.mp3",
      transcriptUrl: "/transcripts/published/mock-podcast.md",
      sizeBytes: 1024,
      checksum: "sha256-mock",
      updatedAt: "2026-05-21T09:00:00+08:00",
      archivedVersions: [],
    };

    expect(getPodcastDisplayState(podcast)).toEqual({ kind: "player", podcast });
  });

  it("blocks playback for withdrawn podcasts", () => {
    expect(getPodcastDisplayState({ status: "withdrawn", version: 1, title: "Withdrawn" })).toEqual({
      kind: "withdrawn",
      message: "本期 AI 播客正在修订，暂不可播放",
    });
  });

  it("shows a non-playing status for draft or pending podcasts", () => {
    expect(getPodcastDisplayState({ status: "pending", version: 1, title: "Pending" })).toEqual({
      kind: "status",
      message: "AI 播客生成中",
    });
  });
});
