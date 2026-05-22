import { createHash, randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { publicUrlToFilePath } from "./lib/weekly-paths.mjs";

function isMissingError(error) {
  return error && typeof error === "object" && "code" in error && error.code === "ENOENT";
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function formatChecksum(hex) {
  return `sha256-${hex}`;
}

function stableJsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

async function writeTextFileAtomically(filePath, text) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${randomUUID()}`;
  await writeFile(tempPath, text, "utf8");
  await rename(tempPath, filePath);
}

export const archiveAssetsInternals = {
  defaultWriteTextFileAtomically: writeTextFileAtomically,
  writeTextFileAtomically,
};

async function loadJsonWithText(filePath, label) {
  let text;

  try {
    text = await readFile(filePath, "utf8");
  } catch (error) {
    if (isMissingError(error)) {
      throw new Error(`${label} not found: ${filePath}`);
    }

    throw error;
  }

  try {
    return {
      text,
      value: JSON.parse(text),
    };
  } catch (error) {
    throw new Error(
      `Failed to parse ${label}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function readRequiredFile(filePath, label) {
  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      throw new Error(`${label} is not a file: ${filePath}`);
    }

    return {
      buffer: await readFile(filePath),
      sizeBytes: fileStat.size,
    };
  } catch (error) {
    if (isMissingError(error)) {
      throw new Error(`Missing ${label}: ${filePath}`);
    }

    throw error;
  }
}

async function destinationChecksumIfPresent(destinationPath) {
  try {
    return sha256(await readFile(destinationPath));
  } catch (error) {
    if (isMissingError(error)) return null;
    throw error;
  }
}

async function copyArchiveFile(buffer, destinationPath, expectedChecksumHex, label) {
  const existingChecksumHex = await destinationChecksumIfPresent(destinationPath);
  if (existingChecksumHex !== null) {
    if (existingChecksumHex === expectedChecksumHex) return;
    throw new Error(`Archive ${label} already exists with different bytes: ${destinationPath}`);
  }

  await mkdir(path.dirname(destinationPath), { recursive: true });
  await writeFile(destinationPath, buffer, { flag: "wx" });
  const copiedChecksumHex = await destinationChecksumIfPresent(destinationPath);
  if (copiedChecksumHex !== expectedChecksumHex) {
    throw new Error(`Archive ${label} checksum mismatch after copy: ${destinationPath}`);
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} is required`);
  }
  return value;
}

function findCard(cards, cardId) {
  if (!Array.isArray(cards)) {
    throw new Error("data/cards.json must contain an array");
  }

  const card = cards.find((item) => item?.id === cardId);
  if (!card) {
    throw new Error(`Card not found: ${cardId}`);
  }

  return card;
}

function findPodcast(card, version) {
  const podcast = card?.podcast;
  if (!podcast || typeof podcast !== "object") {
    throw new Error(`Card ${card.id} has no podcast to archive`);
  }

  const podcastVersion = podcast.version ?? 1;
  if (Number(version) !== Number(podcastVersion)) {
    throw new Error(
      `Podcast version mismatch for ${card.id}: expected ${version}, current ${podcastVersion}`,
    );
  }

  if (!podcast.audioUrl || !podcast.transcriptUrl) {
    throw new Error(`Card ${card.id} podcast audioUrl and transcriptUrl are required`);
  }

  return podcast;
}

function buildArchiveOperations(projectRoot, card, podcast, reason, archivedAt) {
  const version = podcast.version ?? 1;
  const audioSourcePath = publicUrlToFilePath(podcast.audioUrl, projectRoot);
  const transcriptSourcePath = publicUrlToFilePath(podcast.transcriptUrl, projectRoot);
  const audioExtension = path.extname(audioSourcePath) || ".mp3";
  const transcriptExtension = path.extname(transcriptSourcePath) || ".md";
  const audioArchiveUrl = `/archive/audio/${card.id}-podcast-v${version}${audioExtension}`;
  const transcriptArchiveUrl = `/archive/transcripts/${card.id}-podcast-v${version}${transcriptExtension}`;

  return [
    {
      cardId: card.id,
      assetType: "podcast-audio",
      version,
      sourceUrl: podcast.audioUrl,
      archiveUrl: audioArchiveUrl,
      sourcePath: audioSourcePath,
      archivePath: publicUrlToFilePath(audioArchiveUrl, projectRoot),
      reason,
      archivedAt,
    },
    {
      cardId: card.id,
      assetType: "podcast-transcript",
      version,
      sourceUrl: podcast.transcriptUrl,
      archiveUrl: transcriptArchiveUrl,
      sourcePath: transcriptSourcePath,
      archivePath: publicUrlToFilePath(transcriptArchiveUrl, projectRoot),
      reason,
      archivedAt,
    },
  ];
}

function upsertArchiveManifest(manifest, entries) {
  const existingItems = Array.isArray(manifest.items) ? manifest.items : [];
  const existingByVersionKey = new Map(
    existingItems.map((item) => [`${item?.cardId}::${item?.assetType}::${item?.version}`, item]),
  );
  const additions = [];

  for (const entry of entries) {
    const versionKey = `${entry.cardId}::${entry.assetType}::${entry.version}`;
    const existing = existingByVersionKey.get(versionKey);

    if (!existing) {
      additions.push(entry);
      continue;
    }

    if (
      existing.archiveUrl !== entry.archiveUrl ||
      existing.sourceUrl !== entry.sourceUrl ||
      existing.checksum !== entry.checksum
    ) {
      throw new Error(`Conflicting archive manifest entry for ${versionKey}`);
    }
  }

  if (additions.length === 0) {
    return manifest;
  }

  return {
    ...manifest,
    updatedAt: entries[0]?.archivedAt ?? new Date().toISOString(),
    items: [...existingItems, ...additions],
  };
}

function withdrawCard(cards, cardId, reason, withdrawnAt) {
  let changed = false;
  const nextCards = cards.map((card) => {
    if (card?.id !== cardId) return card;
    if (card?.podcast?.status === "withdrawn") return card;

    changed = true;
    return {
      ...card,
      podcast: {
        ...card.podcast,
        status: "withdrawn",
        withdrawnAt,
        withdrawReason: reason,
        archivedVersions: [
          ...(Array.isArray(card.podcast?.archivedVersions) ? card.podcast.archivedVersions : []),
          {
            version: card.podcast?.version ?? 1,
            status: "archived",
            audioUrl: card.podcast?.audioUrl,
            transcriptUrl: card.podcast?.transcriptUrl,
            archivedAt: withdrawnAt,
            reason,
          },
        ],
      },
    };
  });

  return { changed, cards: nextCards };
}

function parseArgs(argv) {
  const result = {};
  const allowedValueFlags = new Set(["type", "cardId", "version", "reason"]);

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--withdraw") {
      result.withdraw = true;
      continue;
    }

    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      if (!allowedValueFlags.has(key)) {
        throw new Error(`Unknown argument: ${arg}`);
      }
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        throw new Error(`${arg} requires a value`);
      }
      result[key] = value;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return result;
}

export async function runArchiveAssets({
  projectRoot = process.cwd(),
  type,
  cardId,
  version,
  reason,
  withdraw = false,
  now = new Date().toISOString(),
} = {}) {
  const resolvedCardId = requireString(cardId, "cardId");
  const resolvedReason = requireString(reason, "reason");
  const resolvedType = withdraw ? "podcast" : requireString(type, "type");

  if (resolvedType !== "podcast") {
    throw new Error(`Unsupported archive type: ${resolvedType}`);
  }

  const cardsPath = path.join(projectRoot, "data", "cards.json");
  const archiveManifestPath = path.join(projectRoot, "data", "archive-manifest.json");
  const cardsState = await loadJsonWithText(cardsPath, "data/cards.json");
  const archiveManifestState = await loadJsonWithText(
    archiveManifestPath,
    "archive-manifest.json",
  );
  const card = findCard(cardsState.value, resolvedCardId);
  const podcast = findPodcast(card, version ?? card.podcast?.version ?? 1);
  const operations = buildArchiveOperations(projectRoot, card, podcast, resolvedReason, now);
  const entries = [];

  for (const operation of operations) {
    const { buffer, sizeBytes } = await readRequiredFile(operation.sourcePath, operation.assetType);
    const checksumHex = sha256(buffer);
    await copyArchiveFile(buffer, operation.archivePath, checksumHex, operation.assetType);
    entries.push({
      cardId: operation.cardId,
      assetType: operation.assetType,
      status: "archived",
      version: operation.version,
      sourceUrl: operation.sourceUrl,
      archiveUrl: operation.archiveUrl,
      reason: operation.reason,
      archivedAt: operation.archivedAt,
      sizeBytes,
      checksum: formatChecksum(checksumHex),
    });
  }

  const nextManifest = upsertArchiveManifest(archiveManifestState.value, entries);
  const manifestChanged =
    JSON.stringify(nextManifest) !== JSON.stringify(archiveManifestState.value);

  if (manifestChanged) {
    await archiveAssetsInternals.writeTextFileAtomically(
      archiveManifestPath,
      stableJsonText(nextManifest),
    );
  }

  if (withdraw) {
    const withdrawal = withdrawCard(cardsState.value, resolvedCardId, resolvedReason, now);
    if (withdrawal.changed) {
      try {
        await archiveAssetsInternals.writeTextFileAtomically(
          cardsPath,
          stableJsonText(withdrawal.cards),
        );
      } catch (error) {
        if (manifestChanged) {
          await archiveAssetsInternals.writeTextFileAtomically(
            archiveManifestPath,
            archiveManifestState.text,
          );
        }
        throw error;
      }
    }
  }

  return {
    cardId: resolvedCardId,
    version: podcast.version ?? 1,
    archivedCount: entries.length,
    withdrawn: Boolean(withdraw),
  };
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const result = await runArchiveAssets(args);
  console.log(
    `Archived ${result.archivedCount} assets for ${result.cardId} v${result.version}${result.withdrawn ? " and marked withdrawn" : ""}`,
  );
}

const scriptEntryPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptEntryPath) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
