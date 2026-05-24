import path from "node:path";
import { fileURLToPath } from "node:url";

import { formatCapacityReport, measureCapacity } from "./check-site-capacity.mjs";
import { validatePublishedPodcastAssets } from "./validate-weekly-assets.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function runLintChecks(projectRoot = rootDir) {
  const validation = await validatePublishedPodcastAssets(projectRoot);
  const capacity = await measureCapacity(projectRoot);

  const errors = [...validation.errors];
  const warnings = capacity.status === "warning"
    ? [`Site capacity warning: public is ${capacity.results.find((item) => item.path === "public")?.formattedSize ?? "unknown"}.`]
    : [];

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    capacity,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const summary = await runLintChecks();

  for (const warning of summary.warnings) {
    console.warn(`WARN ${warning}`);
  }
  if (summary.warnings.length > 0) {
    console.warn(formatCapacityReport(summary.capacity));
  }

  for (const error of summary.errors) {
    console.error(`ERROR ${error}`);
  }

  if (!summary.ok) {
    process.exitCode = 1;
  }
}
