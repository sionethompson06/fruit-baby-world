// Pure helpers for matching stories to characters via featuredCharacters metadata.
// Safe in both server and client contexts — no Node.js imports.
//
// featuredCharacters may store either slugs ("pineapple-baby") or display names
// ("Pineapple Baby"). normalizeCharacterSlug handles both forms transparently.
// Future storybooks: save character names or slugs in the featuredCharacters array
// (either format works — this helper normalizes at read time).

export function normalizeCharacterSlug(value: string): string {
  // Already a valid slug — lowercase, digits, hyphens only
  if (/^[a-z][a-z0-9-]*$/.test(value)) return value;
  // Convert display name → slug: "Pineapple Baby" → "pineapple-baby"
  return value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function getStoryCharacterSlugs(
  episode: { featuredCharacters?: string[] }
): string[] {
  const raw = episode.featuredCharacters ?? [];
  return [...new Set(raw.map(normalizeCharacterSlug))];
}

export function storyFeaturesCharacter(
  episode: { featuredCharacters?: string[] },
  characterSlug: string
): boolean {
  const slugs = getStoryCharacterSlugs(episode);
  const normalized = normalizeCharacterSlug(characterSlug);
  // tiki and tiki-trouble are the same character in the data
  if (normalized === "tiki" || normalized === "tiki-trouble") {
    return slugs.includes("tiki") || slugs.includes("tiki-trouble");
  }
  return slugs.includes(normalized);
}

export function getCharacterStoryCounts(
  episodes: { featuredCharacters?: string[] }[],
  characterSlugs: string[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const slug of characterSlugs) {
    counts[slug] = episodes.filter((e) => storyFeaturesCharacter(e, slug)).length;
  }
  return counts;
}
