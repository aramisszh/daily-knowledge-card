import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  formatBytes,
  getDirectorySizeBytes,
  pathExists,
  sha256File,
} from "./podcast-file-utils.mjs";

const tempDirs = [];

async function makeTempDir() {
  const dirPath = await mkdtemp(join(tmpdir(), "podcast-file-utils-"));
  tempDirs.push(dirPath);
  return dirPath;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dirPath) => rm(dirPath, { force: true, recursive: true })),
  );
});

describe("pathExists", () => {
  it("returns true for an existing file and false for a missing path", async () => {
    const dirPath = await makeTempDir();
    const filePath = join(dirPath, "episode.txt");
    await writeFile(filePath, "hello");

    await expect(pathExists(filePath)).resolves.toBe(true);
    await expect(pathExists(join(dirPath, "missing.txt"))).resolves.toBe(false);
  });
});

describe("sha256File", () => {
  it("returns the sha256 checksum for a file", async () => {
    const dirPath = await makeTempDir();
    const filePath = join(dirPath, "episode.txt");
    await writeFile(filePath, "hello world");

    await expect(sha256File(filePath)).resolves.toBe(
      "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9",
    );
  });
});

describe("getDirectorySizeBytes", () => {
  it("sums nested file sizes without changing files", async () => {
    const dirPath = await makeTempDir();
    const nestedDirPath = join(dirPath, "nested");
    await mkdir(nestedDirPath);
    await writeFile(join(dirPath, "a.txt"), "1234");
    await writeFile(join(nestedDirPath, "b.txt"), "abcdef");

    await expect(getDirectorySizeBytes(dirPath)).resolves.toBe(10);
  });
});

describe("formatBytes", () => {
  it("formats byte counts into readable units", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(1023)).toBe("1023 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 * 1024)).toBe("1 MB");
  });
});
