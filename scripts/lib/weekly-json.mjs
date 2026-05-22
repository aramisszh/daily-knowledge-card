import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export async function readJsonFile(filePath) {
  let rawText;

  try {
    rawText = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(
      `Failed to read JSON file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    throw new Error(
      `Failed to parse JSON file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export async function writeJsonFileStable(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
