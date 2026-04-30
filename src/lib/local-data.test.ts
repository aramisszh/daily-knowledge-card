import { describe, expect, it } from "vitest";
import { mockCards } from "./mock-cards";
import { mergeCardsWithRecords } from "./local-data";

describe("mergeCardsWithRecords", () => {
  it("overrides dynamic study fields with local study records", () => {
    const [firstCard] = mockCards;

    const merged = mergeCardsWithRecords([firstCard], [
      {
        cardId: firstCard.id,
        completed: true,
        completedAt: "2026-04-30T08:00:00+08:00",
        favorite: true,
        needReview: true,
        note: null,
        createdAt: "2026-04-30T08:00:00+08:00",
        updatedAt: "2026-04-30T08:00:00+08:00",
      },
    ]);

    expect(merged[0].completed).toBe(true);
    expect(merged[0].favorite).toBe(true);
    expect(merged[0].needReview).toBe(true);
  });

  it("keeps original card state when no local record exists", () => {
    const [firstCard] = mockCards;
    const merged = mergeCardsWithRecords([firstCard], []);

    expect(merged[0]).toEqual(firstCard);
  });
});
