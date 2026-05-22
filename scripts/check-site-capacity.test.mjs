import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { formatCapacityReport, measureCapacity } from "./check-site-capacity.mjs";

const tempDirs = [];

async function makeProjectFixture() {
  const root = await mkdtemp(join(tmpdir(), "site-capacity-"));
  tempDirs.push(root);
  await mkdir(join(root, "public/generated-cards"), { recursive: true });
  await mkdir(join(root, "public/audio/published"), { recursive: true });
  await mkdir(join(root, "public/transcripts/published"), { recursive: true });
  await mkdir(join(root, "public/archive"), { recursive: true });
  await writeFile(join(root, "public/generated-cards/card.png"), "1234");
  await writeFile(join(root, "public/audio/published/card.wav"), "abcdef");
  await writeFile(join(root, "public/transcripts/published/card.md"), "hi");
  return root;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dirPath) => rm(dirPath, { force: true, recursive: true })));
});

describe("measureCapacity", () => {
  it("reports the expected public asset directories", async () => {
    const root = await makeProjectFixture();
    const summary = await measureCapacity(root);

    expect(summary.status).toBe("ok");
    expect(summary.results.map((item) => item.label)).toEqual([
      "public/generated-cards",
      "public/audio",
      "public/transcripts",
      "public/archive",
      "public",
    ]);
    expect(summary.results.find((item) => item.label === "public/generated-cards")?.sizeBytes).toBe(4);
    expect(formatCapacityReport(summary)).toContain("public/audio");
  });
});
