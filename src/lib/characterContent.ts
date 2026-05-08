// Server-only dynamic character loader.
// Reads all *.json files from src/content/characters/ at request time.
// Do not import this in client components.

import fs from "fs";
import path from "path";
import type { Character } from "@/lib/content";

const CHARACTERS_DIR = path.join(process.cwd(), "src/content/characters");

export function loadAllCharactersFromDisk(): Character[] {
  const files = fs
    .readdirSync(CHARACTERS_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
  return files.map(
    (f) =>
      JSON.parse(
        fs.readFileSync(path.join(CHARACTERS_DIR, f), "utf8")
      ) as Character
  );
}

function isPublicCharacter(c: Character): boolean {
  if (
    c.approvalMode === "draft" ||
    c.approvalMode === "official-internal" ||
    c.approvalMode === "archived"
  )
    return false;
  if (c.approvalMode === "public") return true;
  return c.status === "active" && c.publicUseAllowed !== false;
}

export function getPublicCharactersFromDisk(): Character[] {
  return loadAllCharactersFromDisk().filter(isPublicCharacter);
}

export function getPublicCharacterBySlugFromDisk(
  slug: string
): Character | undefined {
  return getPublicCharactersFromDisk().find((c) => c.slug === slug);
}
