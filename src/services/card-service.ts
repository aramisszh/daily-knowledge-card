import { getSingaporeDateString } from "../lib/date";
import { readLocalCards } from "../lib/local-data";
import { calculateStreak } from "../lib/progress";
import { supabaseAdmin } from "../lib/supabase-admin";
import type { AppKnowledgeCard, StatsSummary, StudyRecordRow } from "../types/knowledge";

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

async function loadCardsAndRecords() {
  const [cards, recordRows] = await Promise.all([loadLocalCards(), loadStudyRecordRows()]);
  return { cards, recordRows };
}

async function assertLocalCardExists(cardId: string) {
  const cards = await loadLocalCards();
  const cardExists = cards.some((card) => card.id === cardId);
  if (!cardExists) {
    throw new Error("Card not found");
  }
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
  await assertLocalCardExists(cardId);
  const current = await getStudyRecordByCardId(cardId);
  const payload = {
    user_id: USER_ID,
    card_id: cardId,
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
  const { cards, recordRows } = await loadCardsAndRecords();
  const merged = mergeCardsWithStudyRecords(cards, recordRows);
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
  const { cards: localCards, recordRows } = await loadCardsAndRecords();
  const cards = mergeCardsWithStudyRecords(localCards, recordRows);
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
  const current = await getStudyRecordByCardId(cardId);
  return upsertStudyRecord(cardId, {
    is_favorite: !(current?.is_favorite ?? false),
  });
}

export async function toggleReviewInDatabase(cardId: string) {
  const current = await getStudyRecordByCardId(cardId);
  return upsertStudyRecord(cardId, {
    need_review: !(current?.need_review ?? false),
  });
}
