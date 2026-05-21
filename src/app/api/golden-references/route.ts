// GET /api/golden-references
// Returns admin-only golden references, optionally filtered.
// Auth: Protected by proxy.ts — requires valid admin cookie.

import {
  loadGoldenReferences,
  type GoldenReferenceRole,
  type StoryPanelGoldenReference,
} from "@/lib/storyPanelGoldenReferences";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);

  const characterSlug = url.searchParams.get("characterSlug") ?? undefined;
  const episodeSlug = url.searchParams.get("episodeSlug") ?? undefined;
  const role = url.searchParams.get("role") as GoldenReferenceRole | null ?? undefined;
  const tag = url.searchParams.get("tag") ?? undefined;
  const limit = parseInt(url.searchParams.get("limit") ?? "100", 10);

  const all = loadGoldenReferences();

  let filtered: StoryPanelGoldenReference[] = all;

  if (characterSlug) {
    filtered = filtered.filter(
      (r) => r.characterSlugs.includes(characterSlug) || r.primaryCharacterSlug === characterSlug
    );
  }
  if (episodeSlug) {
    filtered = filtered.filter((r) => r.episodeSlug === episodeSlug);
  }
  if (role) {
    filtered = filtered.filter((r) => r.referenceRole === role);
  }
  if (tag) {
    filtered = filtered.filter((r) => r.tags.includes(tag));
  }

  // Sort by most recent first
  filtered = filtered
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, isNaN(limit) || limit <= 0 ? 100 : limit);

  return Response.json({
    ok: true,
    goldenReferences: filtered,
    total: all.length,
    filteredCount: filtered.length,
  });
}
