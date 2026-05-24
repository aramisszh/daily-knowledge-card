import { createHash } from "node:crypto";
import {
  copyFile,
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { runImportWeeklyImages } from "./import-weekly-images.mjs";

const TEMP_DIRS = [];
const WEEK_ID = "2026-05-22_to_2026-05-28";
const WEEK_KEY = "2026-W22";
const CARD_ID = "2026-05-22-post-station-network";

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

function checksumFor(buffer) {
  return `sha256-${createHash("sha256").update(buffer).digest("hex")}`;
}

async function createFixtureProject() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "import-weekly-images-test-"),
  );
  TEMP_DIRS.push(projectRoot);

  const weekDir = path.join(projectRoot, "automation", "weekly", WEEK_ID);
  const rawImagesDir = path.join(weekDir, "images", "raw");
  const generatedCardsDir = path.join(projectRoot, "public", "generated-cards");
  await mkdir(rawImagesDir, { recursive: true });
  await mkdir(generatedCardsDir, { recursive: true });

  const weeklyPlanPath = path.join(weekDir, "weekly-plan.json");
  const rawImagePath = path.join(rawImagesDir, `${CARD_ID}.png`);
  const destinationPath = path.join(generatedCardsDir, `${CARD_ID}.png`);

  const plan = {
    weekId: WEEK_ID,
    createdAt: "2026-05-21T09:30:00.000Z",
    updatedAt: "2026-05-21T09:30:00.000Z",
    status: "created",
    cards: [
      {
        cardId: CARD_ID,
        title: "驿站网络为什么能加快信息传递",
        image: {
          status: "pending",
          publishedUrl: null,
          sizeBytes: null,
          checksum: null,
        },
        extraField: {
          keepMe: true,
        },
      },
    ],
    preservedTopLevel: {
      note: "keep",
    },
  };

  await writeFile(
    weeklyPlanPath,
    `${JSON.stringify(plan, null, 2)}\n`,
    "utf8",
  );

  return {
    projectRoot,
    weeklyPlanPath,
    rawImagePath,
    destinationPath,
  };
}

async function createIncomingFixtureProject() {
  const projectRoot = await mkdtemp(
    path.join(os.tmpdir(), "import-weekly-images-incoming-test-"),
  );
  TEMP_DIRS.push(projectRoot);

  const weekDir = path.join(projectRoot, "automation", "incoming", WEEK_KEY);
  const imageAssetsDir = path.join(weekDir, "image-assets");
  const generatedCardsDir = path.join(projectRoot, "public", "generated-cards");
  await mkdir(imageAssetsDir, { recursive: true });
  await mkdir(generatedCardsDir, { recursive: true });

  const weeklyPlanPath = path.join(weekDir, "weekly-plan.json");
  const sourceImagePath = path.join(imageAssetsDir, `${CARD_ID}.png`);
  const destinationPath = path.join(generatedCardsDir, `${CARD_ID}.png`);

  const plan = {
    weekKey: WEEK_KEY,
    workflowMode: "incoming-pack",
    status: "received",
    cards: [
      {
        cardId: CARD_ID,
        title: "驿站网络为什么能加快信息传递",
        image: {
          status: "pending",
          sourceFileName: `${CARD_ID}.png`,
          publishedUrl: null,
          sizeBytes: null,
          checksum: null,
        },
      },
    ],
  };

  await writeFile(
    weeklyPlanPath,
    `${JSON.stringify(plan, null, 2)}\n`,
    "utf8",
  );

  return {
    projectRoot,
    weeklyPlanPath,
    sourceImagePath,
    destinationPath,
  };
}

async function readPlan(weeklyPlanPath) {
  return JSON.parse(await readFile(weeklyPlanPath, "utf8"));
}

async function readPlanText(weeklyPlanPath) {
  return readFile(weeklyPlanPath, "utf8");
}

describe("runImportWeeklyImages", () => {
  it("throws when weekId and weekKey are both missing", async () => {
    await expect(runImportWeeklyImages()).rejects.toThrow("weekId or weekKey is required");
  });

  it("throws when weekly-plan.json is missing", async () => {
    const { projectRoot, weeklyPlanPath } = await createFixtureProject();
    await import("node:fs/promises").then(({ rm }) => rm(weeklyPlanPath));

    await expect(
      runImportWeeklyImages({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow(weeklyPlanPath);
  });

  it("throws when a required source image is missing", async () => {
    const { projectRoot, weeklyPlanPath, rawImagePath } = await createFixtureProject();
    const planTextBefore = await readPlanText(weeklyPlanPath);

    await expect(
      runImportWeeklyImages({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow(CARD_ID);
    await expect(
      runImportWeeklyImages({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow(rawImagePath);
    expect(await readPlanText(weeklyPlanPath)).toBe(planTextBefore);
  });

  it("copies a missing destination file and updates weekly plan image fields", async () => {
    const { projectRoot, weeklyPlanPath, rawImagePath, destinationPath } =
      await createFixtureProject();
    const sourceBytes = Buffer.from("source-image-bytes");
    await writeFile(rawImagePath, sourceBytes);

    const result = await runImportWeeklyImages({ projectRoot, weekId: WEEK_ID });

    expect(result.importedCount).toBe(1);
    expect(await readFile(destinationPath)).toEqual(sourceBytes);

    const plan = await readPlan(weeklyPlanPath);
    expect(plan.preservedTopLevel).toEqual({ note: "keep" });
    expect(plan.cards[0].extraField).toEqual({ keepMe: true });
    expect(plan.cards[0].image).toMatchObject({
      status: "imported",
      publishedUrl: `/generated-cards/${CARD_ID}.png`,
      sizeBytes: sourceBytes.length,
      checksum: checksumFor(sourceBytes),
    });
  });

  it("imports images from an incoming weekly pack when weekKey is provided", async () => {
    const { projectRoot, weeklyPlanPath, sourceImagePath, destinationPath } =
      await createIncomingFixtureProject();
    const sourceBytes = Buffer.from("incoming-image-bytes");
    await writeFile(sourceImagePath, sourceBytes);

    const result = await runImportWeeklyImages({ projectRoot, weekKey: WEEK_KEY });

    expect(result.importedCount).toBe(1);
    expect(await readFile(destinationPath)).toEqual(sourceBytes);

    const plan = await readPlan(weeklyPlanPath);
    expect(plan.cards[0].image).toMatchObject({
      status: "imported",
      sourceFileName: `${CARD_ID}.png`,
      publishedUrl: `/generated-cards/${CARD_ID}.png`,
      sizeBytes: sourceBytes.length,
      checksum: checksumFor(sourceBytes),
    });
  });

  it("is idempotent when the destination already has the same checksum", async () => {
    const { projectRoot, weeklyPlanPath, rawImagePath, destinationPath } =
      await createFixtureProject();
    const sourceBytes = Buffer.from("same-image-bytes");
    await writeFile(rawImagePath, sourceBytes);
    await copyFile(rawImagePath, destinationPath);
    const beforeBytes = await readFile(destinationPath);

    const result = await runImportWeeklyImages({ projectRoot, weekId: WEEK_ID });

    expect(result.importedCount).toBe(1);
    expect(await readFile(destinationPath)).toEqual(beforeBytes);

    const plan = await readPlan(weeklyPlanPath);
    expect(plan.cards[0].image).toMatchObject({
      status: "imported",
      publishedUrl: `/generated-cards/${CARD_ID}.png`,
      sizeBytes: sourceBytes.length,
      checksum: checksumFor(sourceBytes),
    });
  });

  it("throws when the destination exists with different bytes and leaves it unchanged", async () => {
    const { projectRoot, weeklyPlanPath, rawImagePath, destinationPath } =
      await createFixtureProject();
    const sourceBytes = Buffer.from("source-image-bytes");
    const destinationBytes = Buffer.from("different-destination-bytes");
    const planTextBefore = await readPlanText(weeklyPlanPath);
    await writeFile(rawImagePath, sourceBytes);
    await writeFile(destinationPath, destinationBytes);

    await expect(
      runImportWeeklyImages({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow(destinationPath);

    expect(await readFile(destinationPath)).toEqual(destinationBytes);
    expect(await readPlanText(weeklyPlanPath)).toBe(planTextBefore);
  });

  it("throws on invalid cardId before any partial import or plan update", async () => {
    const { projectRoot, weeklyPlanPath } = await createFixtureProject();
    const weekDir = path.join(projectRoot, "automation", "weekly", WEEK_ID);
    const rawImagesDir = path.join(weekDir, "images", "raw");
    const generatedCardsDir = path.join(projectRoot, "public", "generated-cards");
    const validCardId = CARD_ID;
    const invalidCardId = "../escape";
    const plan = {
      weekId: WEEK_ID,
      createdAt: "2026-05-21T09:30:00.000Z",
      updatedAt: "2026-05-21T09:30:00.000Z",
      status: "created",
      cards: [
        {
          cardId: validCardId,
          image: {
            status: "pending",
            publishedUrl: null,
            sizeBytes: null,
            checksum: null,
          },
        },
        {
          cardId: invalidCardId,
          image: {
            status: "pending",
            publishedUrl: null,
            sizeBytes: null,
            checksum: null,
          },
        },
      ],
    };

    await writeFile(
      weeklyPlanPath,
      `${JSON.stringify(plan, null, 2)}\n`,
      "utf8",
    );
    const planTextBefore = await readPlanText(weeklyPlanPath);
    const validSourceBytes = Buffer.from("valid-image-bytes");
    await writeFile(path.join(rawImagesDir, `${validCardId}.png`), validSourceBytes);

    await expect(
      runImportWeeklyImages({ projectRoot, weekId: WEEK_ID }),
    ).rejects.toThrow(`Invalid cardId: ${invalidCardId}`);

    await expect(
      readFile(path.join(generatedCardsDir, `${validCardId}.png`)),
    ).rejects.toThrow();
    expect(await readPlanText(weeklyPlanPath)).toBe(planTextBefore);
  });
});

describe("import-weekly-images CLI", () => {
  it("prints imported count for a valid week id", async () => {
    const { projectRoot, rawImagePath } = await createFixtureProject();
    await writeFile(rawImagePath, Buffer.from("cli-image-bytes"));
    const scriptPath = path.resolve("scripts/import-weekly-images.mjs");

    const result = spawnSync(process.execPath, [scriptPath, WEEK_ID], {
      cwd: projectRoot,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Imported 1 images");
  });

  it("exits nonzero with a clear message when no weekly identifier is provided", async () => {
    const { projectRoot } = await createFixtureProject();
    const scriptPath = path.resolve("scripts/import-weekly-images.mjs");

    const result = spawnSync(process.execPath, [scriptPath], {
      cwd: projectRoot,
      encoding: "utf8",
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("weekId or weekKey is required");
  });
});
