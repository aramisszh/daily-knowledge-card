import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabaseAdmin } from "../lib/supabase-admin";
import { listCardsFromDatabase, markCardCompleteInDatabase } from "./card-service";

vi.mock("../lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

const mockFrom = vi.mocked(supabaseAdmin.from);

const baseCardRow = {
  id: "11111111-1111-1111-1111-111111111111",
  title: "Test Card",
  subtitle: "Subtitle",
  category: "工程技术",
  sub_category: "半导体",
  difficulty: "入门",
  card_date: "2026-05-01",
  summary: "Summary",
  keywords: ["EUV"],
  content_json: {
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
  image_prompt: null,
  image_url: "https://example.com/card.png",
  image_storage_path: null,
  generation_status: "completed",
  error_message: null,
  created_at: "2026-05-01T00:00:00Z",
  updated_at: "2026-05-01T00:00:00Z",
};

beforeEach(() => {
  mockFrom.mockReset();
});

describe("listCardsFromDatabase", () => {
  it("merges study_records into returned cards", async () => {
    mockFrom
      .mockImplementationOnce(() => ({
        select: () => ({
          order: vi.fn().mockResolvedValue({
            data: [baseCardRow],
            error: null,
          }),
        }),
      }))
      .mockImplementationOnce(() => ({
        select: () => ({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: "record-1",
                user_id: "default_user",
                card_id: baseCardRow.id,
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
      }));

    const cards = await listCardsFromDatabase();

    expect(cards).toHaveLength(1);
    expect(cards[0].completed).toBe(true);
    expect(cards[0].favorite).toBe(true);
    expect(cards[0].needReview).toBe(false);
  });
});

describe("markCardCompleteInDatabase", () => {
  it("upserts the completion record in Supabase", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "record-1",
        user_id: "default_user",
        card_id: baseCardRow.id,
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
    const eq = vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle })) }));

    mockFrom.mockImplementation((table: string) => {
      if (table === "study_records") {
        return {
          select: () => ({
            eq,
          }),
          upsert,
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    const record = await markCardCompleteInDatabase(baseCardRow.id, "finished", "2026-05-01T08:00:00+08:00");

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "default_user",
        card_id: baseCardRow.id,
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
