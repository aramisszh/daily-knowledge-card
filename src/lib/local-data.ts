import { readFile } from "node:fs/promises";
import path from "node:path";
import { mockCards } from "./mock-cards";
import type { AppKnowledgeCard } from "../types/knowledge";

const dataDir = path.join(process.cwd(), "data");
const cardsFile = path.join(dataDir, "cards.json");

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await readFile(filePath, "utf8");
    return JSON.parse(content) as T;
  } catch (error: any) {
    if (error?.code === "ENOENT") return fallback;
    throw error;
  }
}

export async function readLocalCards() {
  return readJsonFile<AppKnowledgeCard[]>(cardsFile, mockCards);
}
