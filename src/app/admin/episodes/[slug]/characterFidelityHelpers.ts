import type { Character } from "@/lib/content";

export const CHARACTER_FIDELITY_NOTES: Record<string, string[]> = {
  "pineapple baby": [
    "Preserve sunny yellow/golden body and green leafy crown.",
    "Maintain warm friendly face, rounded baby-like shape, and kind expression.",
  ],
  "ube baby": [
    "Preserve purple/lavender ube identity and gentle dreamy expression.",
    "Cozy magical feeling, rounded baby-like shape.",
  ],
  "kiwi baby": [
    "Preserve fuzzy kiwi-brown body, green kiwi top, leaf crown, and white blossom accent.",
    "Maintain warm eyes, blush, and sweet smile.",
  ],
  "coconut baby": [
    "Preserve warm coconut-brown and cream identity and calm comforting expression.",
    "Rounded baby-like shape.",
  ],
  "mango baby": [
    "Preserve mango yellow/orange identity and playful joyful expression.",
    "Tropical green leaf accents, energetic baby-like personality.",
  ],
  "tiki trouble": [
    "Preserve carved wooden tiki body, leafy green crown, and orange/red band.",
    "Mischievous kid-friendly expression — must remain funny, dramatic, sneaky, and kid-friendly.",
    "Do not make Tiki scary, violent, horror-like, cruel, evil, or too intense.",
  ],
};

export const GLOBAL_FIDELITY_RULES = [
  "Preserve official body shape and silhouette.",
  "Preserve proportions — do not make characters taller, thinner, older, or more realistic.",
  "Preserve eye style, mouth style, and blush/cheek details.",
  "Preserve fruit/body textures, leaf/crown shapes, and accessories.",
  "Preserve color palette exactly — do not shift hues or desaturate.",
  "Preserve cute baby-like design language throughout.",
  "Do not redesign characters — no new features, altered silhouettes, or style changes.",
  "Do not use generic fruit mascots or loose 'inspired by' versions.",
  "Do not publish generated visuals without human approval.",
];

export function getCharacterFidelityNotes(
  characters: string[],
  charBySlug?: Record<string, Character>
): { character: string; notes: string[] }[] {
  return characters
    .map((c) => {
      const nameKey = c.toLowerCase().replace(/-/g, " ").trim();
      const hardcoded = CHARACTER_FIDELITY_NOTES[nameKey];
      if (hardcoded) return { character: c, notes: hardcoded };
      if (charBySlug) {
        const slug = nameKey.replace(/ /g, "-");
        const charObj = charBySlug[slug];
        if (charObj) {
          const notes: string[] = [];
          if (charObj.visualIdentity?.styleNotes) notes.push(charObj.visualIdentity.styleNotes);
          if (Array.isArray(charObj.characterRules?.always)) {
            (charObj.characterRules.always as string[]).slice(0, 5).forEach((r) => notes.push(r));
          }
          if (Array.isArray(charObj.generationRestrictions)) {
            (charObj.generationRestrictions as string[])
              .slice(0, 2)
              .forEach((r) => notes.push(`Note: ${r}`));
          }
          if (notes.length > 0) return { character: c, notes };
        }
      }
      return null;
    })
    .filter((x): x is { character: string; notes: string[] } => x !== null);
}
