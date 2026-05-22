import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatBytes, getDirectorySizeBytes, pathExists } from "./lib/podcast-file-utils.mjs";

export const CAPACITY_WARNING_BYTES = 80 * 1024 * 1024;
export const CAPACITY_BLOCK_BYTES = 100 * 1024 * 1024;

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const capacityTargets = [
  { label: "public/generated-cards", path: "public/generated-cards" },
  { label: "public/audio", path: "public/audio" },
  { label: "public/transcripts", path: "public/transcripts" },
  { label: "public/archive", path: "public/archive" },
  { label: "public", path: "public" },
];

export async function measureCapacity(projectRoot = rootDir) {
  const results = [];

  for (const target of capacityTargets) {
    const absolutePath = path.join(projectRoot, target.path);
    const exists = await pathExists(absolutePath);
    const sizeBytes = exists ? await getDirectorySizeBytes(absolutePath) : 0;
    results.push({ ...target, exists, sizeBytes, formattedSize: formatBytes(sizeBytes) });
  }

  const publicTotal = results.find((item) => item.path === "public")?.sizeBytes ?? 0;
  const status = publicTotal >= CAPACITY_BLOCK_BYTES ? "blocked" : publicTotal >= CAPACITY_WARNING_BYTES ? "warning" : "ok";

  return { status, publicTotal, results };
}

export function formatCapacityReport(summary) {
  const lines = ["Site capacity report:"];
  for (const item of summary.results) {
    const missing = item.exists ? "" : " (missing)";
    lines.push(`- ${item.label}: ${item.formattedSize}${missing}`);
  }

  if (summary.status === "blocked") {
    lines.push(`Status: BLOCKED. public is ${formatBytes(summary.publicTotal)}, at or above 100 MB.`);
  } else if (summary.status === "warning") {
    lines.push(`Status: WARNING. public is ${formatBytes(summary.publicTotal)}, at or above 80 MB.`);
  } else {
    lines.push(`Status: OK. public is ${formatBytes(summary.publicTotal)}.`);
  }

  return lines.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const summary = await measureCapacity();
  console.log(formatCapacityReport(summary));
  if (summary.status === "blocked") process.exitCode = 1;
}
