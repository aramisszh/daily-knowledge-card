import { access, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { join } from "node:path";

export async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);

    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

export async function getDirectorySizeBytes(dirPath) {
  const stats = await stat(dirPath);

  if (!stats.isDirectory()) {
    return stats.size;
  }

  const entries = await readdir(dirPath, { withFileTypes: true });
  let totalSize = 0;

  for (const entry of entries) {
    const entryPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      totalSize += await getDirectorySizeBytes(entryPath);
      continue;
    }

    if (entry.isFile()) {
      const entryStats = await stat(entryPath);
      totalSize += entryStats.size;
    }
  }

  return totalSize;
}

export function formatBytes(bytes) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = -1;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const rounded = value >= 10 ? value.toFixed(0) : value.toFixed(1);
  return `${rounded.replace(/\.0$/, "")} ${units[unitIndex]}`;
}
