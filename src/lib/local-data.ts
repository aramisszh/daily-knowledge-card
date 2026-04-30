import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSingaporeDateString } from "./date";
import { mockCards } from "./mock-cards";
import { calculateStreak } from "./progress";
import type { AppKnowledgeCard, LocalStudyRecord, StatsSummary } from "../types/knowledge";

const dataDir = path.join(process.cwd(), "data");
const cardsFile = path.join(dataDir, "cards.json");
const studyRecordsFile = path.join(dataDir, "study-records.json");

async function ensureDataDir() {
  await mkdir(dataDir, { recursive: true });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error: any) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await ensureDataDir();
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function readLocalCards() {
  return readJsonFile<AppKnowledgeCard[]>(cardsFile, mockCards);
}

export async function readLocalStudyRecords() {
  return readJsonFile<LocalStudyRecord[]>(studyRecordsFile, []);
}

export async function writeLocalStudyRecords(records: LocalStudyRecord[]) {
  await writeJsonFile(studyRecordsFile, records);
}

export function mergeCardsWithRecords(cards: AppKnowledgeCard[], records: LocalStudyRecord[]) {
  const recordMap = new Map(records.map((record) => [record.cardId, record]));

  return cards.map((card) => {
    const record = recordMap.get(card.id);
    if (!record) return card;

    return {
      ...card,
      completed: record.completed,
      favorite: record.favorite,
      needReview: record.needReview,
    };
  });
}

export async function listLocalCards(filters?: { category?: string | null; query?: string | null; status?: string | null }) {
  const cards = await readLocalCards();
  const records = await readLocalStudyRecords();
  const merged = mergeCardsWithRecords(cards, records)
    .slice()
    .sort((a, b) => b.cardDate.localeCompare(a.cardDate));

  const category = filters?.category ?? null;
  const query = filters?.query?.trim() ?? "";
  const status = filters?.status ?? null;

  return merged.filter((card) => {
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

export async function getLocalCardById(id: string) {
  const cards = await listLocalCards();
  return cards.find((card) => card.id === id) ?? null;
}

export async function getTodayLocalCard(todayDate = getSingaporeDateString()) {
  const cards = await listLocalCards();
  return cards.find((card) => card.cardDate === todayDate) ?? null;
}

export async function getLocalStats(todayDate = getSingaporeDateString()): Promise<StatsSummary> {
  const cards = await readLocalCards();
  const records = await readLocalStudyRecords();
  const merged = mergeCardsWithRecords(cards, records);

  const completedCards = merged.filter((card) => card.completed);
  const favoriteCards = merged.filter((card) => card.favorite);
  const reviewCards = merged.filter((card) => card.needReview);
  const completedByCategory = completedCards.reduce<Record<string, number>>((acc, card) => {
    acc[card.category] = (acc[card.category] || 0) + 1;
    return acc;
  }, {});

  return {
    total: merged.length,
    completed: completedCards.length,
    favorites: favoriteCards.length,
    needReview: reviewCards.length,
    streak: calculateStreak(
      records.map((record) => ({ completed_at: record.completedAt })),
      todayDate
    ),
    completedByCategory,
    cards: {
      completed: completedCards,
      favorite: favoriteCards,
      review: reviewCards,
    },
  };
}

function createDefaultRecord(cardId: string): LocalStudyRecord {
  const now = new Date().toISOString();
  return {
    cardId,
    completed: false,
    completedAt: null,
    favorite: false,
    needReview: false,
    note: null,
    createdAt: now,
    updatedAt: now,
  };
}

async function updateRecord(cardId: string, updater: (record: LocalStudyRecord) => LocalStudyRecord) {
  const cards = await readLocalCards();
  const cardExists = cards.some((card) => card.id === cardId);
  if (!cardExists) {
    throw new Error("Card not found");
  }

  const records = await readLocalStudyRecords();
  const index = records.findIndex((record) => record.cardId === cardId);
  const current = index >= 0 ? records[index] : createDefaultRecord(cardId);
  const next = { ...updater(current), updatedAt: new Date().toISOString() };
  const nextRecords = records.slice();

  if (index >= 0) {
    nextRecords[index] = next;
  } else {
    nextRecords.push(next);
  }

  await writeLocalStudyRecords(nextRecords);
  return next;
}

export async function markLocalCardComplete(cardId: string, note?: string | null) {
  return updateRecord(cardId, (record) => ({
    ...record,
    completed: true,
    completedAt: new Date().toISOString(),
    note: note ?? record.note,
  }));
}

export async function toggleLocalFavorite(cardId: string) {
  return updateRecord(cardId, (record) => ({
    ...record,
    favorite: !record.favorite,
  }));
}

export async function toggleLocalReview(cardId: string) {
  return updateRecord(cardId, (record) => ({
    ...record,
    needReview: !record.needReview,
  }));
}
