import path from "node:path";

import { pathExists } from "./lib/podcast-file-utils.mjs";
import { publicUrlToFilePath } from "./lib/weekly-paths.mjs";

async function readJson(filePath, errors, label) {
  try {
    const { readFile } = await import("node:fs/promises");
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    errors.push(`${label} unreadable: ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

async function validatePublicFile(projectRoot, publicUrl, label, errors) {
  try {
    const filePath = publicUrlToFilePath(publicUrl, projectRoot);
    if (!(await pathExists(filePath))) {
      errors.push(`${label} missing: ${publicUrl} -> ${filePath}`);
    }
  } catch (error) {
    errors.push(`${label} invalid URL: ${publicUrl}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function hasChineseText(value) {
  return typeof value === "string" && /[\u3400-\u9fff]/.test(value);
}

function hasSuspiciousTextCorruption(value) {
  if (typeof value !== "string") return false;
  if (value.includes("�")) return true;
  return /\?{2,}/.test(value);
}

function collectSuspiciousText(value, jsonPath, cardId, errors) {
  if (typeof value === "string") {
    if (hasSuspiciousTextCorruption(value)) {
      errors.push(`Card ${cardId} suspicious text at ${jsonPath}: ${value}`);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectSuspiciousText(item, `${jsonPath}[${index}]`, cardId, errors);
    });
    return;
  }

  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      collectSuspiciousText(child, `${jsonPath}.${key}`, cardId, errors);
    }
  }
}

function podcastKey(cardId, version) {
  return `${cardId}::${version ?? 1}`;
}

function manifestKey(item) {
  return podcastKey(item?.cardId, item?.version);
}

export async function validatePublishedPodcastAssets(projectRoot = process.cwd()) {
  const errors = [];
  const requiredPaths = [
    "data/cards.json",
    "data/podcast-manifest.json",
    "data/archive-manifest.json",
    "public/generated-cards",
    "public/audio",
    "public/transcripts",
    "public/archive",
  ];

  const checks = await Promise.all(
    requiredPaths.map(async (relativePath) => ({
      path: relativePath,
      exists: await pathExists(path.join(projectRoot, relativePath)),
    })),
  );

  for (const check of checks) {
    if (!check.exists) {
      errors.push(`Required path missing: ${check.path}`);
    }
  }

  const cardsPath = path.join(projectRoot, "data", "cards.json");
  const podcastManifestPath = path.join(projectRoot, "data", "podcast-manifest.json");
  const archiveManifestPath = path.join(projectRoot, "data", "archive-manifest.json");
  const cards = await readJson(cardsPath, errors, "data/cards.json");
  const podcastManifest = await readJson(
    podcastManifestPath,
    errors,
    "data/podcast-manifest.json",
  );
  const archiveManifest = await readJson(
    archiveManifestPath,
    errors,
    "data/archive-manifest.json",
  );

  if (Array.isArray(cards)) {
    const publishedPodcastByKey = new Map();

    for (const card of cards) {
      const cardId = card?.id ?? "<missing-id>";

      collectSuspiciousText(card, `data/cards.json[id=${cardId}]`, cardId, errors);

      if (card?.imageUrl) {
        await validatePublicFile(projectRoot, card.imageUrl, `Card ${cardId} imageUrl`, errors);
      } else {
        errors.push(`Card ${cardId} imageUrl missing`);
      }

      const podcast = card?.podcast;
      if (!podcast) continue;

      if (podcast.status === "published") {
        if (!podcast.audioUrl) {
          errors.push(`Card ${cardId} published podcast audioUrl missing`);
        } else {
          await validatePublicFile(
            projectRoot,
            podcast.audioUrl,
            `Card ${cardId} podcast audioUrl`,
            errors,
          );
        }

        if (!podcast.transcriptUrl) {
          errors.push(`Card ${cardId} published podcast transcriptUrl missing`);
        } else {
          await validatePublicFile(
            projectRoot,
            podcast.transcriptUrl,
            `Card ${cardId} podcast transcriptUrl`,
            errors,
          );
        }

        publishedPodcastByKey.set(podcastKey(cardId, podcast.version), {
          cardId,
          version: podcast.version ?? 1,
          title: podcast.title ?? card.title,
          audioUrl: podcast.audioUrl,
          transcriptUrl: podcast.transcriptUrl,
          duration: podcast.duration ?? null,
          sizeBytes: podcast.sizeBytes ?? null,
          checksum: podcast.checksum ?? null,
        });
      }

      if (podcast.status === "withdrawn") {
        for (const fieldName of ["audioUrl", "transcriptUrl", "checksum"]) {
          if (podcast[fieldName]) {
            errors.push(`Card ${cardId} withdrawn podcast must not expose ${fieldName} at data/cards.json[id=${cardId}].podcast.${fieldName}`);
          }
        }
      }
    }

    if (podcastManifest && Array.isArray(podcastManifest.items)) {
      const manifestPublishedItems = podcastManifest.items.filter(
        (item) => item?.status === "published",
      );
      const manifestByKey = new Map(manifestPublishedItems.map((item) => [manifestKey(item), item]));

      for (const [key, cardPodcast] of publishedPodcastByKey.entries()) {
        const manifestItem = manifestByKey.get(key);
        if (!manifestItem) {
          errors.push(`Podcast manifest missing published item for ${cardPodcast.cardId} v${cardPodcast.version} at data/podcast-manifest.json.items`);
          continue;
        }

        for (const fieldName of ["title", "audioUrl", "transcriptUrl", "duration", "sizeBytes", "checksum"]) {
          if ((manifestItem[fieldName] ?? null) !== (cardPodcast[fieldName] ?? null)) {
            errors.push(
              `Podcast manifest mismatch for ${cardPodcast.cardId} v${cardPodcast.version} at data/podcast-manifest.json.items[cardId=${cardPodcast.cardId},version=${cardPodcast.version}].${fieldName}`,
            );
          }
        }
      }

      for (const item of manifestPublishedItems) {
        const key = manifestKey(item);
        if (!publishedPodcastByKey.has(key)) {
          errors.push(
            `Podcast manifest has stale published item for ${item?.cardId ?? "<missing-cardId>"} v${item?.version ?? 1} at data/podcast-manifest.json.items[cardId=${item?.cardId ?? "<missing-cardId>"},version=${item?.version ?? 1}]`,
          );
        }
      }
    } else if (podcastManifest) {
      errors.push("data/podcast-manifest.json items must be an array");
    }
  } else if (cards) {
    errors.push("data/cards.json must be an array");
  }

  if (archiveManifest && Array.isArray(archiveManifest.items)) {
    for (const item of archiveManifest.items) {
      if (item?.archiveUrl) {
        await validatePublicFile(
          projectRoot,
          item.archiveUrl,
          `Archive ${item.cardId ?? "<missing-cardId>"} ${item.assetType ?? "<missing-assetType>"}`,
          errors,
        );
      }
    }
  } else if (archiveManifest) {
    errors.push("data/archive-manifest.json items must be an array");
  }

  return {
    ok: errors.length === 0,
    checks,
    errors,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const summary = await validatePublishedPodcastAssets();
  for (const item of summary.checks) {
    console.log(`${item.exists ? "OK" : "MISSING"} ${item.path}`);
  }
  for (const error of summary.errors) {
    console.error(`ERROR ${error}`);
  }
  if (!summary.ok) process.exitCode = 1;
}
