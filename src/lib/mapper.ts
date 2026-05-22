import type { KnowledgeCardRow, StudyRecordRow } from "@/types/knowledge";

export function mapCard(row: KnowledgeCardRow, record?: Partial<StudyRecordRow> | null) {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle ?? "",
    category: row.category,
    subCategory: row.sub_category ?? "",
    difficulty: row.difficulty ?? "入门",
    cardDate: row.card_date,
    imageUrl: row.image_url ?? "",
    summary: row.summary ?? "",
    keywords: row.keywords ?? [],
    completed: record?.completed ?? false,
    favorite: record?.is_favorite ?? false,
    needReview: record?.need_review ?? false,
    podcastListened: record?.podcast_listened ?? false,
    podcastListenedAt: record?.podcast_listened_at ?? null,
    content: row.content_json,
  };
}
