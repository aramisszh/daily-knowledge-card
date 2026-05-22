import type { PodcastInfo } from "@/types/knowledge";

export type PodcastDisplayState =
  | { kind: "hidden" }
  | { kind: "player"; podcast: PodcastInfo }
  | { kind: "withdrawn"; message: string }
  | { kind: "status"; message: string };

export function getPodcastDisplayState(podcast?: PodcastInfo | null): PodcastDisplayState {
  if (!podcast || podcast.status === "none") return { kind: "hidden" };

  if (podcast.status === "published" && podcast.audioUrl) {
    return { kind: "player", podcast };
  }

  if (podcast.status === "withdrawn") {
    return { kind: "withdrawn", message: "本期 AI 播客正在修订，暂不可播放" };
  }

  return { kind: "status", message: "AI 播客生成中" };
}

export function formatPodcastDuration(duration?: number) {
  if (!duration || duration < 0) return "";
  const minutes = Math.floor(duration / 60);
  const seconds = Math.round(duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
