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
  id: "11111111-1111-1111-1111-111111111111",
  title: "Test Card",
  subtitle: "Subtitle",
  category: "工程技术",
  subCategory: "半导体",
  difficulty: "入门",
  cardDate: "2026-05-01",
  imageUrl: "/generated-cards/test-card.png",
  summary: "Summary",
  keywords: ["EUV"],
  completed: false,
  favorite: false,
  needReview: false,
  content: {
    title: "Test Card",
    subtitle: "Subtitle",
    category: "工程技术",
    subCategory: "半导体",
    difficulty: "入门",
    summary: "Summary",
    coreMechanism: "Mechanism",
    whyImportant: ["Reason"],
    keywords: [{ term: "EUV", desc: "Keyword" }],
    misconception: { title: "Misconception", content: "Content" },
    financeAngle: "Finance",
    memoryHooks: ["Hook"],
    thinkingQuestions: [{ level: "概念理解", question: "Q1", answer: "A1", keyPoint: "K1" }],
    conclusion: "Conclusion",
  },
};

beforeEach(() => {
  mockReadLocalCards.mockReset();
  mockReadLocalCards.mockResolvedValue([baseCard]);
  mockFrom.mockReset();
});

describe("listCardsFromDatabase", () => {
  it("keeps local cards as the content source and merges Supabase study records", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "study_records") {
        return {
          select: () => ({
            eq: vi.fn().mockResolvedValue({
              data: [
                {
                  id: "record-1",
                  user_id: "default_user",
                  card_id: baseCard.id,
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

      throw new Error(`Unexpected table: ${table}`);
    });

    const cards = await listCardsFromDatabase();

    expect(mockReadLocalCards).toHaveBeenCalled();
    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe("Test Card");
    expect(cards[0].completed).toBe(true);
    expect(cards[0].favorite).toBe(true);
    expect(cards[0].needReview).toBe(false);
  });
});

describe("markCardCompleteInDatabase", () => {
  it("upserts the completion record in Supabase for an existing local card", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "record-1",
        user_id: "default_user",
        card_id: baseCard.id,
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
    const selectAfterUpsert = vi.fn(() => ({ single }));
    const upsert = vi.fn(() => ({ select: selectAfterUpsert }));
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const eqCardId = vi.fn(() => ({ maybeSingle }));
    const eqUserId = vi.fn(() => ({ eq: eqCardId }));

    mockFrom.mockImplementation((table: string) => {
      if (table === "study_records") {
        return {
          select: () => ({
            eq: eqUserId,
          }),
          upsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const record = await markCardCompleteInDatabase(baseCard.id, "finished", "2026-05-01T08:00:00+08:00");

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "default_user",
        card_id: baseCard.id,
        completed: true,
        completed_at: "2026-05-01T08:00:00+08:00",
        note: "finished",
      }),
      { onConflict: "user_id,card_id" }
    );
    expect(record.completed).toBe(true);
    expect(record.note).toBe("finished");
  });
});
