import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readJsonFile, writeJsonFileStable } from "./weekly-json.mjs";

const tempDirs = [];

async function makeTempDir() {
  const dirPath = await mkdtemp(join(tmpdir(), "weekly-json-"));
  tempDirs.push(dirPath);
  return dirPath;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dirPath) => rm(dirPath, { force: true, recursive: true })),
  );
});

describe("weekly JSON helpers", () => {
  it("reads JSON with a clear file path in parse errors", async () => {
    const dirPath = await makeTempDir();
    const filePath = join(dirPath, "bad.json");
    await writeFile(filePath, "{bad");

    await expect(readJsonFile(filePath)).rejects.toThrow(filePath);
  });

  it("reads JSON with a clear file path in read errors", async () => {
    const dirPath = await makeTempDir();
    const filePath = join(dirPath, "missing.json");

    await expect(readJsonFile(filePath)).rejects.toThrow(filePath);
  });

  it("writes stable UTF-8 JSON with a trailing newline", async () => {
    const dirPath = await makeTempDir();
    const filePath = join(dirPath, "nested", "cards.json");

    await writeJsonFileStable(filePath, { title: "中文标题", items: [1] });

    expect(await readFile(filePath, "utf8")).toBe(
      '{\n  "title": "中文标题",\n  "items": [\n    1\n  ]\n}\n',
    );
  });
});
