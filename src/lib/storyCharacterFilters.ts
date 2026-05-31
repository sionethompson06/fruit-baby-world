// Pure helpers for matching stories to characters via featuredCharacters metadata.
// Safe in both server and client contexts — no Node.js imports.
//
// featuredCharacters may store either slugs ("pineapple-baby") or display names
// ("Pineapple Baby"). normalizeCharacterSlug handles both forms transparently.
// Future storybooks: save character names or slugs in the featuredCharacters array
// (either format works — this helper normalizes at read time).

// Canonical slug aliases — resolves alternate spellings to the canonical slug.
// Applied after basic slug normalization so both display-name and slug inputs work.
const SLUG_ALIASES: Record<string, string> = {
  "dragonfruit-baby": "dragon-fruit-baby",
  "dragonfruit": "dragon-fruit-baby",
};

export function normalizeCharacterSlug(value: string): string {
  // Base normalization: lowercase, trim, spaces → hyphens, strip unsafe chars
  const base = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  // Resolve known aliases to canonical slugs
  return SLUG_ALIASES[base] ?? base;
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
