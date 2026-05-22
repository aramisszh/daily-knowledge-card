import { describe, expect, it } from "vitest";
import {
  buildNextWeekDates,
  createCardId,
  createWeeklyPlan,
  inferNextWeekId,
} from "./weekly-plan.mjs";

const ALLOWED_CATEGORIES = new Set([
  "自然科学",
  "工程技术",
  "人文社科",
  "商业金融",
  "历史文明",
  "艺术设计",
  "综合冷知识",
]);

describe("buildNextWeekDates", () => {
  it("finds the latest card date and returns the next seven ISO dates", () => {
    const cards = [
      { cardDate: "2026-05-20" },
      { cardDate: "2026-05-18" },
      { cardDate: "2026-05-21" },
    ];

    expect(buildNextWeekDates(cards)).toEqual([
      "2026-05-22",
      "2026-05-23",
      "2026-05-24",
      "2026-05-25",
      "2026-05-26",
      "2026-05-27",
      "2026-05-28",
    ]);
  });

  it("rejects calendar-invalid ISO dates", () => {
    expect(() => buildNextWeekDates([{ cardDate: "2026-02-30" }])).toThrow(
      "Invalid ISO date",
    );
  });

  it("keeps leap-year dates valid", () => {
    expect(buildNextWeekDates([{ cardDate: "2024-02-28" }])[0]).toBe("2024-02-29");
  });
});

describe("inferNextWeekId", () => {
  it("builds the week id from the next seven dates", () => {
    const cards = [{ cardDate: "2026-05-21" }];

    expect(inferNextWeekId(cards)).toBe("2026-05-22_to_2026-05-28");
  });
});

describe("createCardId", () => {
  it("uses required title-to-slug mappings", () => {
    expect(createCardId("2026-05-22", "订阅收入为什么更稳定")).toBe(
      "2026-05-22-subscription-revenue",
    );
    expect(createCardId("2026-05-23", "驿站网络为什么能加快信息传递")).toBe(
      "2026-05-23-post-station-network",
    );
    expect(createCardId("2026-05-24", "字体字重为什么会影响阅读感受")).toBe(
      "2026-05-24-font-weight",
    );
    expect(createCardId("2026-05-25", "飞机圆角窗为什么更安全")).toBe(
      "2026-05-25-rounded-airplane-windows",
    );
    expect(createCardId("2026-05-26", "洋流为什么会影响全球气候")).toBe(
      "2026-05-26-ocean-currents-climate",
    );
    expect(createCardId("2026-05-27", "数据库索引为什么能让查询变快")).toBe(
      "2026-05-27-database-index",
    );
    expect(createCardId("2026-05-28", "锚定效应为什么会影响价格判断")).toBe(
      "2026-05-28-anchoring-effect",
    );
  });

  it("falls back to a generic topic slug when the title is not mapped", () => {
    expect(createCardId("2026-05-29", "未知主题")).toBe("2026-05-29-topic");
  });
});

describe("createWeeklyPlan", () => {
  it("creates a deterministic seven-card weekly plan without mutating source cards", () => {
    const cards = [
      { id: "old-1", cardDate: "2026-05-20", title: "旧卡片" },
      { id: "old-2", cardDate: "2026-05-21", title: "旧卡片2" },
    ];
    const originalCards = structuredClone(cards);

    const plan = createWeeklyPlan(cards, { now: "2026-05-21T09:30:00.000Z" });

    expect(cards).toEqual(originalCards);
    expect(plan.weekId).toBe("2026-05-22_to_2026-05-28");
    expect(plan.createdAt).toBe("2026-05-21T09:30:00.000Z");
    expect(plan.updatedAt).toBe("2026-05-21T09:30:00.000Z");
    expect(plan.status).toBe("created");
    expect(plan.cards).toHaveLength(7);

    expect(plan.cards[0]).toMatchObject({
      cardId: "2026-05-22-post-station-network",
      cardDate: "2026-05-22",
      category: "历史文明",
      subCategory: "基础设施",
      difficulty: "入门",
      title: "驿站网络为什么能加快信息传递",
      subtitle: "分段接力如何缩短长距离通信时间",
      summary: "把长途通信拆成标准化节点接力，速度和可靠性都会提升。",
      keywords: ["驿站", "接力", "网络"],
      image: {
        status: "pending",
        rawPath:
          "automation/weekly/2026-05-22_to_2026-05-28/images/raw/2026-05-22-post-station-network.png",
        publishedUrl: null,
        sizeBytes: null,
        checksum: null,
      },
      podcast: {
        status: "pending",
        version: 1,
        title: "驿站网络为什么能加快信息传递",
        targetDurationSec: 180,
        pendingDir:
          "automation/weekly/2026-05-22_to_2026-05-28/podcast_jobs/pending/2026-05-22-post-station-network",
        doneDir:
          "automation/weekly/2026-05-22_to_2026-05-28/podcast_jobs/done/2026-05-22-post-station-network",
        audioUrl: null,
        transcriptUrl: null,
        duration: null,
        sizeBytes: null,
        checksum: null,
      },
    });

    expect(plan.cards[0].content).toMatchObject({
      title: "驿站网络为什么能加快信息传递",
      subtitle: "分段接力如何缩短长距离通信时间",
      category: "历史文明",
      subCategory: "基础设施",
      difficulty: "入门",
      summary: "把长途通信拆成标准化节点接力，速度和可靠性都会提升。",
      coreMechanism: expect.any(String),
      whyImportant: expect.arrayContaining([expect.any(String)]),
      processSteps: expect.arrayContaining([
        expect.objectContaining({
          step: 1,
          title: expect.any(String),
          desc: expect.any(String),
        }),
      ]),
      keywords: expect.arrayContaining([
        expect.objectContaining({
          term: expect.any(String),
          desc: expect.any(String),
        }),
      ]),
      misconception: expect.objectContaining({
        title: expect.any(String),
        content: expect.any(String),
      }),
      financeAngle: expect.any(String),
      memoryHooks: expect.arrayContaining([expect.any(String)]),
      thinkingQuestions: expect.arrayContaining([
        expect.objectContaining({
          level: expect.any(String),
          question: expect.any(String),
          answer: expect.any(String),
          keyPoint: expect.any(String),
        }),
      ]),
      conclusion: expect.any(String),
    });

    expect(plan.cards[6]).toMatchObject({
      cardId: "2026-05-28-subscription-revenue",
      cardDate: "2026-05-28",
      title: "订阅收入为什么更稳定",
    });
  });

  it("derives card and content categories from cardDate using the UTC weekly rotation", () => {
    const cards = [{ cardDate: "2026-05-21" }];

    const plan = createWeeklyPlan(cards, { now: "2026-05-21T09:30:00.000Z" });

    expect(plan.cards.map((card) => card.category)).toEqual([
      "历史文明",
      "艺术设计",
      "综合冷知识",
      "自然科学",
      "工程技术",
      "人文社科",
      "商业金融",
    ]);

    for (const card of plan.cards) {
      expect(ALLOWED_CATEGORIES.has(card.category)).toBe(true);
      expect(ALLOWED_CATEGORIES.has(card.content.category)).toBe(true);
      expect(card.content.category).toBe(card.category);
    }
  });
});
