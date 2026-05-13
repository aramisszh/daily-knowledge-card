import { describe, expect, it } from "vitest";
import { readLocalCards } from "./local-data";

const expectedTitles = {
  "2026-05-14": "为什么便利店愿意把门店开得离彼此很近",
  "2026-05-15": "科举制度为什么能增强古代王朝的治理稳定性",
  "2026-05-16": "对比为什么能让版面重点更突出",
  "2026-05-17": "为什么有些人更容易招蚊子",
  "2026-05-18": "冰芯为什么能记录过去的气候变化",
  "2026-05-19": "GPS为什么能知道你在哪",
  "2026-05-20": "从众效应为什么会影响我们的判断",
} as const;

describe("readLocalCards", () => {
  it("keeps weekly card titles readable for 2026-05-14 to 2026-05-20", async () => {
    const cards = await readLocalCards();

    for (const [cardDate, expectedTitle] of Object.entries(expectedTitles)) {
      const card = cards.find((item) => item.cardDate === cardDate);

      expect(card, `missing card for ${cardDate}`).toBeTruthy();
      expect(card?.title).toBe(expectedTitle);
      expect(card?.title.includes("?")).toBe(false);
      expect(card?.category.includes("?")).toBe(false);
      expect(card?.summary.includes("?")).toBe(false);
    }
  });
});
