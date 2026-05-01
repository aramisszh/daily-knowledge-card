import { getSingaporeDateString } from "../lib/date";
import { readLocalCards } from "../lib/local-data";
import { calculateStreak } from "../lib/progress";
import { supabaseAdmin } from "../lib/supabase-admin";
import type { AppKnowledgeCard, KnowledgeCardRow, StatsSummary, StudyRecordRow } from "../types/knowledge";

const USER_ID = "default_user";

type CardFilters = {
  category?: string | null;
  query?: string | null;
  status?: string | null;
};

type StudyRecordPatch = Partial<Pick<StudyRecordRow, "completed" | "completed_at" | "is_favorite" | "need_review" | "note">>;

function throwIfError(error: { message: string } | null, context: string) {
  if (error) {
    throw new Error(`${context}: ${error.message}`);
  }
}

export function mergeCardsWithStudyRecords(cards: AppKnowledgeCard[], recordRows: StudyRecordRow[]) {
  const recordMap = new Map(recordRows.map((record) => [record.card_id, record]));

  return cards.map((card) => {
    const record = recordMap.get(card.id);
    if (!record) return card;

    return {
      ...card,
      completed: record.completed,
      favorite: record.is_favorite,
      needReview: record.need_review,
    };
  });
}

function applyFilters(cards: AppKnowledgeCard[], filters?: CardFilters) {
  const category = filters?.category ?? null;
  const query = filters?.query?.trim() ?? "";
  const status = filters?.status ?? null;

  return cards.filter((card) => {
    const matchCategory = !category || category === "全部" || card.category === category;
    const matchStatus =
      !status ||
      status === "全部" ||
      (status === "已完成" && card.completed) ||
      (status === "未完成" && !card.completed) ||
      (status === "收藏" && card.favorite) ||
      (status === "待复习" && card.needReview);
    const matchQuery =
      !query ||
      card.title.includes(query) ||
      card.summary.includes(query) ||
      card.keywords.some((keyword) => keyword.includes(query));

    return matchCategory && matchStatus && matchQuery;
  });
}

async function loadLocalCards() {
  const cards = await readLocalCards();
  return cards.slice().sort((a, b) => b.cardDate.localeCompare(a.cardDate));
}

async function loadStudyRecordRows() {
  const { data, error } = await supabaseAdmin.from("study_records").select("*").eq("user_id", USER_ID);
  throwIfError(error, "Failed to load study records");
  return (data ?? []) as StudyRecordRow[];
}

async function loadKnowledgeCardRows() {
  const { data, error } = await supabaseAdmin.from("knowledge_cards").select("*");
  throwIfError(error, "Failed to load knowledge cards");
  return (data ?? []) as KnowledgeCardRow[];
}

async function loadCardsAndRecords() {
  const [cards, recordRows, knowledgeCardRows] = await Promise.all([loadLocalCards(), loadStudyRecordRows(), loadKnowledgeCardRows()]);
  return { cards, recordRows, knowledgeCardRows };
}

async function getLocalCardById(cardId: string) {
  const cards = await loadLocalCards();
  return cards.find((card) => card.id === cardId) ?? null;
}

function remapRecordsToLocalCardIds(cards: AppKnowledgeCard[], recordRows: StudyRecordRow[], knowledgeCardRows: KnowledgeCardRow[]) {
  const cardDateByDbId = new Map(knowledgeCardRows.map((row) => [row.id, row.card_date]));
  const localCardIdByDate = new Map(cards.map((card) => [card.cardDate, card.id]));

  return recordRows.flatMap((record) => {
    const cardDate = cardDateByDbId.get(record.card_id);
    const localCardId = cardDate ? localCardIdByDate.get(cardDate) : null;
    if (!localCardId) return [];

    return [{ ...record, card_id: localCardId }];
  });
}

async function ensureKnowledgeCardRow(localCard: AppKnowledgeCard) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("knowledge_cards")
    .select("*")
    .eq("card_date", localCard.cardDate)
    .maybeSingle();

  throwIfError(existingError, "Failed to resolve knowledge card");
  if (existing) {
    return existing as KnowledgeCardRow;
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("knowledge_cards")
    .insert({
      title: localCard.title,
      subtitle: localCard.subtitle,
      category: localCard.category,
      sub_category: localCard.subCategory,
      difficulty: localCard.difficulty,
      card_date: localCard.cardDate,
      summary: localCard.summary,
      keywords: localCard.keywords,
      content_json: localCard.content,
      image_prompt: null,
      image_url: localCard.imageUrl,
      image_storage_path: null,
      generation_status: "completed",
      error_message: null,
    })
    .select("*")
    .single();

  throwIfError(insertError, "Failed to create knowledge card bridge record");
  return inserted as KnowledgeCardRow;
}

async function getStudyRecordByCardId(cardId: string) {
  const { data, error } = await supabaseAdmin
    .from("study_records")
    .select("*")
    .eq("user_id", USER_ID)
    .eq("card_id", cardId)
    .maybeSingle();

  throwIfError(error, "Failed to load study record");
  return data as StudyRecordRow | null;
}

async function upsertStudyRecord(cardId: string, patch: StudyRecordPatch) {
  const localCard = await getLocalCardById(cardId);
  if (!localCard) {
    throw new Error("Card not found");
  }

  const knowledgeCard = await ensureKnowledgeCardRow(localCard);
  const current = await getStudyRecordByCardId(knowledgeCard.id);
  const payload = {
    user_id: USER_ID,
    card_id: knowledgeCard.id,
    completed: patch.completed ?? current?.completed ?? false,
    completed_at: patch.completed_at ?? current?.completed_at ?? null,
    is_favorite: patch.is_favorite ?? current?.is_favorite ?? false,
    need_review: patch.need_review ?? current?.need_review ?? false,
    note: patch.note ?? current?.note ?? null,
  };

  const { data, error } = await supabaseAdmin
    .from("study_records")
    .upsert(payload, { onConflict: "user_id,card_id" })
    .select("*")
    .single();

  throwIfError(error, "Failed to save study record");
  return data as StudyRecordRow;
}

export async function listCardsFromDatabase(filters?: CardFilters) {
  const { cards, recordRows, knowledgeCardRows } = await loadCardsAndRecords();
  const remappedRecords = remapRecordsToLocalCardIds(cards, recordRows, knowledgeCardRows);
  const merged = mergeCardsWithStudyRecords(cards, remappedRecords);
  return applyFilters(merged, filters);
}

export async function getCardByIdFromDatabase(id: string) {
  const cards = await listCardsFromDatabase();
  return cards.find((card) => card.id === id) ?? null;
}

export async function getTodayCardFromDatabase(todayDate = getSingaporeDateString()) {
  const cards = await listCardsFromDatabase();
  return cards.find((card) => card.cardDate === todayDate) ?? null;
}

export async function getStatsFromDatabase(todayDate = getSingaporeDateString()): Promise<StatsSummary> {
  const { cards: localCards, recordRows, knowledgeCardRows } = await loadCardsAndRecords();
  const remappedRecords = remapRecordsToLocalCardIds(localCards, recordRows, knowledgeCardRows);
  const cards = mergeCardsWithStudyRecords(localCards, remappedRecords);
  const completedCards = cards.filter((card) => card.completed);
  const favoriteCards = cards.filter((card) => card.favorite);
  const reviewCards = cards.filter((card) => card.needReview);
  const completedByCategory = completedCards.reduce<Record<string, number>>((acc, card) => {
    acc[card.category] = (acc[card.category] || 0) + 1;
    return acc;
  }, {});

  return {
    total: cards.length,
    completed: completedCards.length,
    favorites: favoriteCards.length,
    needReview: reviewCards.length,
    streak: calculateStreak(recordRows, todayDate),
    completedByCategory,
    cards: {
      completed: completedCards,
      favorite: favoriteCards,
      review: reviewCards,
    },
  };
}

export async function markCardCompleteInDatabase(cardId: string, note?: string | null, completedAt = new Date().toISOString()) {
  return upsertStudyRecord(cardId, {
    completed: true,
    completed_at: completedAt,
    note: note ?? null,
  });
}

export async function toggleFavoriteInDatabase(cardId: string) {
  const localCard = await getLocalCardById(cardId);
  if (!localCard) {
    throw new Error("Card not found");
  }

  const knowledgeCard = await ensureKnowledgeCardRow(localCard);
  const current = await getStudyRecordByCardId(knowledgeCard.id);
  return upsertStudyRecord(cardId, {
    is_favorite: !(current?.is_favorite ?? false),
  });
}

export async function toggleReviewInDatabase(cardId: string) {
  const localCard = await getLocalCardById(cardId);
  if (!localCard) {
    throw new Error("Card not found");
  }

  const knowledgeCard = await ensureKnowledgeCardRow(localCard);
  const current = await getStudyRecordByCardId(knowledgeCard.id);
  return upsertStudyRecord(cardId, {
    need_review: !(current?.need_review ?? false),
  });
}
