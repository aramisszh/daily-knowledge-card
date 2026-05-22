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
  "2026-05-21": "订阅制为什么能让企业收入更稳定",
  "2026-05-22": "驿站制度为什么能支撑古代帝国的信息传递",
  "2026-05-23": "字体字重为什么会影响阅读感受",
  "2026-05-24": "为什么飞机窗户是圆角的",
  "2026-05-25": "洋流为什么会影响全球气候",
  "2026-05-26": "数据库索引为什么能让查询变快",
  "2026-05-27": "锚定效应为什么会影响价格判断",
} as const;

describe("readLocalCards", () => {
  it("keeps weekly card titles readable for 2026-05-14 to 2026-05-27", async () => {
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

  it("supports optional podcast fields while keeping older cards valid", async () => {
    const cards = await readLocalCards();
    const publishedPodcastCard = cards.find((item) => item.id === "2026-04-30-aviation-engine");
    const withdrawnPodcastCard = cards.find((item) => item.id === "2026-05-01-roman-roads");
    const cardWithoutPodcast = cards.find((item) => item.id === "2026-05-02-negative-space");

    expect(publishedPodcastCard?.podcast?.status).toBe("published");
    expect(publishedPodcastCard?.podcast?.audioUrl).toBe("/audio/published/2026-04-30-aviation-engine-podcast-v1.wav");
    expect(withdrawnPodcastCard?.podcast?.status).toBe("withdrawn");
    expect(cardWithoutPodcast?.podcast).toBeUndefined();
  });
});
