import { mkdtemp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { runWeeklyCreate } from "./weekly-create.mjs";

const FIXTURE_CARDS = [
  {
    id: "2026-05-20-existing-card",
    cardDate: "2026-05-20",
    title: "已有卡片一",
  },
  {
    id: "2026-05-21-existing-card",
    cardDate: "2026-05-21",
    title: "已有卡片二",
  },
];

const TEMP_DIRS = [];

afterEach(async () => {
  await Promise.all(
    TEMP_DIRS.splice(0).map(async (dir) => {
      try {
        await import("node:fs/promises").then(({ rm }) =>
          rm(dir, { recursive: true, force: true }),
        );
      } catch {}
    }),
  );
});

async function createFixtureProject() {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "weekly-create-test-"));
  TEMP_DIRS.push(projectRoot);

  await mkdir(path.join(projectRoot, "data"), { recursive: true });
  const cardsPath = path.join(projectRoot, "data", "cards.json");
  const cardsText = `${JSON.stringify(FIXTURE_CARDS, null, 2)}\n`;
  await writeFile(cardsPath, cardsText, "utf8");

  return { projectRoot, cardsPath, cardsText };
}

function getWeekDir(projectRoot) {
  return path.join(projectRoot, "automation", "weekly", "2026-05-22_to_2026-05-28");
}

describe("runWeeklyCreate", () => {
  it("creates the weekly workspace for the next seven cards without changing data/cards.json bytes", async () => {
    const { projectRoot, cardsPath, cardsText } = await createFixtureProject();

    const result = await runWeeklyCreate({
      projectRoot,
      now: "2026-05-21T09:30:00.000Z",
    });

    expect(result.weekId).toBe("2026-05-22_to_2026-05-28");
    expect(result.nextStep).toContain("ChatGPT");

    const weekDir = getWeekDir(projectRoot);
    const weeklyPlanPath = path.join(weekDir, "weekly-plan.json");
    const imagePromptPath = path.join(weekDir, "image2-prompts.md");
    const macRunLogPath = path.join(weekDir, "mac-run-log.md");
    const handoffPath = path.join(weekDir, "handoff-to-windows.md");

    await expect(stat(weeklyPlanPath)).resolves.toBeTruthy();
    await expect(stat(imagePromptPath)).resolves.toBeTruthy();
    await expect(stat(macRunLogPath)).resolves.toBeTruthy();
    await expect(stat(handoffPath)).resolves.toBeTruthy();
    await expect(stat(path.join(weekDir, "images", "raw"))).resolves.toBeTruthy();
    await expect(
      stat(path.join(weekDir, "podcast_jobs", "pending")),
    ).resolves.toBeTruthy();
    await expect(stat(path.join(weekDir, "podcast_jobs", "done"))).resolves.toBeTruthy();
    await expect(stat(path.join(weekDir, "podcast_jobs", "failed"))).resolves.toBeTruthy();

    const cardsBytesAfter = await readFile(cardsPath);
    expect(cardsBytesAfter.equals(Buffer.from(cardsText, "utf8"))).toBe(true);

    const weeklyPlan = JSON.parse(await readFile(weeklyPlanPath, "utf8"));
    expect(weeklyPlan.weekId).toBe("2026-05-22_to_2026-05-28");
    expect(weeklyPlan.cards).toHaveLength(7);

    const imagePromptText = await readFile(imagePromptPath, "utf8");
    expect(imagePromptText).toContain("cardId: 2026-05-22-post-station-network");
    expect(imagePromptText).toContain("4:5");
    expect(imagePromptText).toContain("必须包含的文字");
    expect(imagePromptText).toContain("版面结构");
    expect(imagePromptText).toContain("禁止事项");
    expect(imagePromptText).toContain("保存文件名：2026-05-22-post-station-network.png");

    const handoffText = await readFile(handoffPath, "utf8");
    expect(handoffText).toContain(
      `copy source: ${path.join(weekDir, "podcast_jobs", "pending")}`,
    );
    expect(handoffText).toContain(
      "D:\\AI-Podcast\\jobs\\pending\\2026-05-22_to_2026-05-28",
    );

    const macRunLogText = await readFile(macRunLogPath, "utf8");
    expect(macRunLogText).toContain("weekly:create");
    expect(macRunLogText).toContain("2026-05-22_to_2026-05-28");

    const pendingRoot = path.join(weekDir, "podcast_jobs", "pending");
    const cardDirs = await readdir(pendingRoot);
    expect(cardDirs).toHaveLength(7);

    for (const cardId of cardDirs) {
      const packageDir = path.join(pendingRoot, cardId);
      const scriptMd = await readFile(path.join(packageDir, "script.md"), "utf8");
      const scriptSrt = await readFile(path.join(packageDir, "script.srt"), "utf8");
      const meta = JSON.parse(
        await readFile(path.join(packageDir, "podcast.meta.json"), "utf8"),
      );

      expect(scriptMd).toContain("A：知识讲解者");
      expect(scriptMd).toContain("B：普通学习者");
      expect(scriptMd).toContain("A：");
      expect(scriptMd).toContain("B：");
      expect(scriptSrt).toContain("A：");
      expect(scriptSrt).toContain("B：");
      expect(scriptSrt).toContain("00:00:00,000");
      expect(meta).toMatchObject({
        cardId,
        podcastVersion: 1,
        title: expect.any(String),
        targetDurationSec: 180,
        language: "zh-CN",
        style: "双人对话式科普",
        speakerA: "host-a",
        speakerB: "host-b",
        status: "pending",
        createdAt: "2026-05-21T09:30:00.000Z",
      });
    }
  });

  it("is idempotent when rerun for the same week and same generated cards", async () => {
    const { projectRoot } = await createFixtureProject();

    await runWeeklyCreate({
      projectRoot,
      now: "2026-05-21T09:30:00.000Z",
    });

    const weekDir = getWeekDir(projectRoot);
    const weeklyPlanPath = path.join(weekDir, "weekly-plan.json");
    const imagePromptPath = path.join(weekDir, "image2-prompts.md");
    const firstPlanText = await readFile(weeklyPlanPath, "utf8");
    const firstImagePromptText = await readFile(imagePromptPath, "utf8");
    const pendingRoot = path.join(weekDir, "podcast_jobs", "pending");
    const initialCards = await readdir(pendingRoot);
    const representativeCardId = initialCards[0];
    const metaPath = path.join(
      pendingRoot,
      representativeCardId,
      "podcast.meta.json",
    );
    const scriptPath = path.join(pendingRoot, representativeCardId, "script.md");
    const firstMetaText = await readFile(metaPath, "utf8");
    const firstScriptText = await readFile(scriptPath, "utf8");

    await runWeeklyCreate({
      projectRoot,
      now: "2026-05-22T10:45:00.000Z",
    });

    const secondPlanText = await readFile(weeklyPlanPath, "utf8");
    const secondImagePromptText = await readFile(imagePromptPath, "utf8");
    const secondCards = await readdir(pendingRoot);
    const secondMetaText = await readFile(metaPath, "utf8");
    const secondScriptText = await readFile(scriptPath, "utf8");

    expect(secondPlanText).toBe(firstPlanText);
    expect(secondImagePromptText).toBe(firstImagePromptText);
    expect(secondMetaText).toBe(firstMetaText);
    expect(secondScriptText).toBe(firstScriptText);
    expect(secondCards).toEqual(initialCards);
    expect(secondCards).toHaveLength(7);
  });

  it("throws a clear error when an existing weekly plan has different card ids", async () => {
    const { projectRoot } = await createFixtureProject();
    const weekDir = getWeekDir(projectRoot);
    await mkdir(weekDir, { recursive: true });
    await writeFile(
      path.join(weekDir, "weekly-plan.json"),
      JSON.stringify(
        {
          weekId: "2026-05-22_to_2026-05-28",
          cards: [{ cardId: "2026-05-22-wrong-topic" }],
        },
        null,
        2,
      ),
      "utf8",
    );

    await expect(
      runWeeklyCreate({
        projectRoot,
        now: "2026-05-21T09:30:00.000Z",
      }),
    ).rejects.toThrow("Existing weekly plan does not match generated cards");
  });

  it("throws a clear error when an existing weekly plan keeps the same card ids but changes content", async () => {
    const { projectRoot } = await createFixtureProject();

    await runWeeklyCreate({
      projectRoot,
      now: "2026-05-21T09:30:00.000Z",
    });

    const weekDir = getWeekDir(projectRoot);
    const weeklyPlanPath = path.join(weekDir, "weekly-plan.json");
    const existingPlan = JSON.parse(await readFile(weeklyPlanPath, "utf8"));
    existingPlan.cards[0].title = "被篡改的标题";
    existingPlan.cards[0].content.conclusion = "被篡改的结论";

    await writeFile(
      weeklyPlanPath,
      `${JSON.stringify(existingPlan, null, 2)}\n`,
      "utf8",
    );

    await expect(
      runWeeklyCreate({
        projectRoot,
        now: "2026-05-22T10:45:00.000Z",
      }),
    ).rejects.toThrow("Existing weekly plan does not match generated cards");
  });
});

describe("weekly-create CLI", () => {
  it("prints the week id and next user step", async () => {
    const { projectRoot } = await createFixtureProject();
    const scriptPath = path.resolve("scripts/weekly-create.mjs");

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: projectRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        TZ: "UTC",
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("2026-05-22_to_2026-05-28");
    expect(result.stdout).toContain("Next step");
    expect(result.stdout).toContain("ChatGPT");
  });
});
