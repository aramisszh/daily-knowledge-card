import { beforeEach, describe, expect, it, vi } from "vitest";
import { readLocalCards } from "../lib/local-data";
import { supabaseAdmin } from "../lib/supabase-admin";
import { listCardsFromDatabase, markCardCompleteInDatabase } from "./card-service";

vi.mock("../lib/local-data", () => ({
  readLocalCards: vi.fn(),
}));

vi.mock("../lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

const mockReadLocalCards = vi.mocked(readLocalCards);
const mockFrom = vi.mocked(supabaseAdmin.from);

const baseCard = {
  id: "2026-05-01-roman-roads",
  title: "Roman Roads",
  subtitle: "Subtitle",
  category: "History",
  subCategory: "Infrastructure",
  difficulty: "Beginner",
  cardDate: "2026-05-01",
  imageUrl: "/generated-cards/2026-05-01-roman-roads.png",
  summary: "Summary",
  keywords: ["rome"],
  completed: false,
  favorite: false,
  needReview: false,
  content: {
    title: "Roman Roads",
    subtitle: "Subtitle",
    category: "History",
    subCategory: "Infrastructure",
    difficulty: "Beginner",
    summary: "Summary",
    coreMechanism: "Mechanism",
    whyImportant: ["Reason"],
    keywords: [{ term: "rome", desc: "Keyword" }],
    misconception: { title: "Misconception", content: "Content" },
    financeAngle: "Finance",
    memoryHooks: ["Hook"],
    thinkingQuestions: [{ level: "Concept", question: "Q1", answer: "A1", keyPoint: "K1" }],
    conclusion: "Conclusion",
  },
};

beforeEach(() => {
  mockReadLocalCards.mockReset();
  mockReadLocalCards.mockResolvedValue([baseCard]);
  mockFrom.mockReset();
});

describe("listCardsFromDatabase", () => {
  it("keeps local cards as the content source and maps study records back by card_date", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "study_records") {
        return {
          select: () => ({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "record-1",
                  user_id: "default_user",
                  card_id: "11111111-1111-1111-1111-111111111111",
                  completed: true,
                  completed_at: "2026-05-01T08:00:00+08:00",
                  is_favorite: true,
                  need_review: false,
                  note: "done",
                  created_at: "2026-05-01T08:00:00+08:00",
                  updated_at: "2026-05-01T08:00:00+08:00",
                },
              ],
              error: null,
            }),
          }),
        };
      }

      if (table === "knowledge_cards") {
        return {
          select: () => Promise.resolve({
            data: [
              {
                id: "11111111-1111-1111-1111-111111111111",
                card_date: "2026-05-01",
              },
            ],
            error: null,
          }),
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const cards = await listCardsFromDatabase();

    expect(mockReadLocalCards).toHaveBeenCalled();
    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe("Roman Roads");
    expect(cards[0].completed).toBe(true);
    expect(cards[0].favorite).toBe(true);
    expect(cards[0].needReview).toBe(false);
  });
});

describe("markCardCompleteInDatabase", () => {
  it("ensures a UUID-backed knowledge card exists before writing the study record", async () => {
    const maybeSingleKnowledgeCard = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          id: "11111111-1111-1111-1111-111111111111",
          card_date: "2026-05-01",
        },
        error: null,
      });
    const knowledgeCardEq = vi.fn(() => ({ maybeSingle: maybeSingleKnowledgeCard }));
    const insertedKnowledgeCardSingle = vi.fn().mockResolvedValue({
      data: {
        id: "11111111-1111-1111-1111-111111111111",
        card_date: "2026-05-01",
      },
      error: null,
    });
    const insertKnowledgeCard = vi.fn(() => ({
      select: () => ({
        single: insertedKnowledgeCardSingle,
      }),
    }));

    const maybeSingleStudyRecord = vi.fn().mockResolvedValue({ data: null, error: null });
    const studyRecordEqCardId = vi.fn(() => ({ maybeSingle: maybeSingleStudyRecord }));
    const studyRecordEqUserId = vi.fn(() => ({ eq: studyRecordEqCardId }));
    const insertedStudyRecordSingle = vi.fn().mockResolvedValue({
      data: {
        id: "record-1",
        user_id: "default_user",
        card_id: "11111111-1111-1111-1111-111111111111",
        completed: true,
        completed_at: "2026-05-01T08:00:00+08:00",
        is_favorite: false,
        need_review: false,
        note: "finished",
        created_at: "2026-05-01T08:00:00+08:00",
        updated_at: "2026-05-01T08:00:00+08:00",
      },
      error: null,
    });
    const upsertStudyRecord = vi.fn(() => ({
      select: () => ({
        single: insertedStudyRecordSingle,
      }),
    }));

    mockFrom.mockImplementation((table: string) => {
      if (table === "knowledge_cards") {
        return {
          select: () => ({
            eq: knowledgeCardEq,
          }),
          insert: insertKnowledgeCard,
        };
      }

      if (table === "study_records") {
        return {
          select: () => ({
            eq: studyRecordEqUserId,
          }),
          upsert: upsertStudyRecord,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const record = await markCardCompleteInDatabase(baseCard.id, "finished", "2026-05-01T08:00:00+08:00");

    expect(insertKnowledgeCard).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Roman Roads",
        card_date: "2026-05-01",
        image_url: "/generated-cards/2026-05-01-roman-roads.png",
      })
    );
    expect(upsertStudyRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "default_user",
        card_id: "11111111-1111-1111-1111-111111111111",
        completed: true,
        completed_at: "2026-05-01T08:00:00+08:00",
        note: "finished",
      }),
      { onConflict: "user_id,card_id" }
    );
    expect(record.completed).toBe(true);
  });
});
