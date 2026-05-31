// Helpers for building and normalizing storybook audio scripts.
// No audio generation — script data only.

import type {
  StorybookAudioScript,
  StorybookAudioScriptPage,
  StorybookAudioSpeaker,
  StorybookAudioScriptBlock,
  StorybookAudioScriptStatus,
  StorybookAudioScriptBlockType,
  StorybookAudioScriptBlockStatus,
} from "@/lib/storybookAudioScriptTypes";
import type { StorybookPage } from "@/lib/storybookPageTypes";

// ─── Constants ─────────────────────────────────────────────────────────────────

const DRAGON_FRUIT_SLUGS = new Set([
  "dragonfruit-baby",
  "dragon-fruit-baby",
  "dragonfruitbaby",
]);

const DRAGON_FRUIT_NAMES = new Set([
  "Dragon Fruit Baby",
  "Dragonfruit Baby",
  "DragonFruit Baby",
  "Dragon-Fruit Baby",
]);

const ALL_FRUIT_BABY_CHARACTERS: StorybookAudioSpeaker[] = [
  { speakerSlug: "pineapple-baby",   speakerName: "Pineapple Baby",   characterSlug: "pineapple-baby" },
  { speakerSlug: "coconut-baby",     speakerName: "Coconut Baby",     characterSlug: "coconut-baby" },
  { speakerSlug: "mango-baby",       speakerName: "Mango Baby",       characterSlug: "mango-baby" },
  { speakerSlug: "ube-baby",         speakerName: "Ube Baby",         characterSlug: "ube-baby" },
  { speakerSlug: "kiwi-baby",        speakerName: "Kiwi Baby",        characterSlug: "kiwi-baby" },
  { speakerSlug: "strawberry-baby",  speakerName: "Strawberry Baby",  characterSlug: "strawberry-baby" },
  { speakerSlug: "dragon-fruit-baby",speakerName: "Dragon Fruit Baby",characterSlug: "dragonfruit-baby" },
  { speakerSlug: "tiki-trouble",     speakerName: "Tiki Trouble",     characterSlug: "tiki" },
];

// ─── Speaker slug normalization ────────────────────────────────────────────────

export function normalizeSpeakerSlug(value: string): string {
  if (!value) return "narrator";
  const trimmed = value.trim();

  // Dragon Fruit alias normalization
  if (DRAGON_FRUIT_SLUGS.has(trimmed.toLowerCase()) || DRAGON_FRUIT_NAMES.has(trimmed)) {
    return "dragon-fruit-baby";
  }

  // Tiki alias
  if (trimmed.toLowerCase() === "tiki") return "tiki-trouble";

  return trimmed
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

// ─── Default speakers list ─────────────────────────────────────────────────────

export function getDefaultStorybookSpeakers(
  featuredCharacters?: string[]
): StorybookAudioSpeaker[] {
  const speakers: StorybookAudioSpeaker[] = [
    { speakerSlug: "narrator", speakerName: "Narrator" },
    ...ALL_FRUIT_BABY_CHARACTERS,
  ];

  if (!featuredCharacters || featuredCharacters.length === 0) return speakers;

  const existingSlugs = new Set(speakers.map((s) => s.speakerSlug));

  for (const name of featuredCharacters) {
    const slug = normalizeSpeakerSlug(name);
    if (!existingSlugs.has(slug)) {
      speakers.push({ speakerSlug: slug, speakerName: name });
      existingSlugs.add(slug);
    }
  }

  return speakers;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const VALID_BLOCK_TYPES = new Set<StorybookAudioScriptBlockType>([
  "narration", "dialogue", "sound-effect",
]);

const VALID_BLOCK_STATUSES = new Set<StorybookAudioScriptBlockStatus>([
  "draft", "approved", "archived",
]);

const VALID_SCRIPT_STATUSES = new Set<StorybookAudioScriptStatus>([
  "draft", "ready-for-generation", "approved", "archived",
]);

function parseBlock(raw: unknown, fallbackOrder: number): StorybookAudioScriptBlock | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id) return null;
  const type: StorybookAudioScriptBlockType = VALID_BLOCK_TYPES.has(raw.type as StorybookAudioScriptBlockType)
    ? (raw.type as StorybookAudioScriptBlockType)
    : "narration";
  const speakerSlug = typeof raw.speakerSlug === "string" ? normalizeSpeakerSlug(raw.speakerSlug) : "narrator";
  const speakerName = typeof raw.speakerName === "string" ? raw.speakerName : speakerSlug;
  const status: StorybookAudioScriptBlockStatus = VALID_BLOCK_STATUSES.has(raw.status as StorybookAudioScriptBlockStatus)
    ? (raw.status as StorybookAudioScriptBlockStatus)
    : "draft";
  return {
    id: raw.id,
    type,
    speakerSlug,
    speakerName,
    text: typeof raw.text === "string" ? raw.text : "",
    voiceId: typeof raw.voiceId === "string" ? raw.voiceId : undefined,
    sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : fallbackOrder,
    status,
    audioUrl: typeof raw.audioUrl === "string" ? raw.audioUrl : undefined,
    pathname: typeof raw.pathname === "string" ? raw.pathname : undefined,
    mimeType: typeof raw.mimeType === "string" ? raw.mimeType : undefined,
    sizeBytes: typeof raw.sizeBytes === "number" ? raw.sizeBytes : undefined,
    durationSeconds: typeof raw.durationSeconds === "number" ? raw.durationSeconds : undefined,
    generatedAt: typeof raw.generatedAt === "string" ? raw.generatedAt : undefined,
    generationProvider: raw.generationProvider === "elevenlabs" ? "elevenlabs" : undefined,
    generationModelId: typeof raw.generationModelId === "string" ? raw.generationModelId : undefined,
    generationError: typeof raw.generationError === "string" ? raw.generationError : undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : undefined,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  };
}

function parsePage(raw: unknown, storybookPage?: StorybookPage): StorybookAudioScriptPage | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.pageId !== "string" || !raw.pageId) return null;
  const rawBlocks = Array.isArray(raw.scriptBlocks) ? raw.scriptBlocks : [];
  const scriptBlocks = rawBlocks
    .map((b, i) => parseBlock(b, i))
    .filter((b): b is StorybookAudioScriptBlock => b !== null);

  return {
    pageId: raw.pageId,
    pageNumber: typeof raw.pageNumber === "number" ? raw.pageNumber : storybookPage?.pageNumber,
    pageRole: typeof raw.pageRole === "string" ? raw.pageRole : storybookPage?.pageRole,
    originalFilename: typeof raw.originalFilename === "string" ? raw.originalFilename : storybookPage?.originalFilename,
    scriptBlocks,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
  };
}

function parseSpeaker(raw: unknown): StorybookAudioSpeaker | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.speakerSlug !== "string" || !raw.speakerSlug) return null;
  if (typeof raw.speakerName !== "string" || !raw.speakerName) return null;
  return {
    speakerSlug: normalizeSpeakerSlug(raw.speakerSlug),
    speakerName: raw.speakerName,
    characterSlug: typeof raw.characterSlug === "string" ? raw.characterSlug : undefined,
    provider: typeof raw.provider === "string" ? raw.provider : undefined,
    voiceId: typeof raw.voiceId === "string" ? raw.voiceId : undefined,
    voiceLabel: typeof raw.voiceLabel === "string" ? raw.voiceLabel : undefined,
  };
}

// ─── Build from scratch ────────────────────────────────────────────────────────

export function buildDefaultStorybookAudioScript(
  storybookPages: StorybookPage[],
  featuredCharacters?: string[]
): StorybookAudioScript {
  const now = new Date().toISOString();
  const speakers = getDefaultStorybookSpeakers(featuredCharacters);

  const pages: StorybookAudioScriptPage[] = storybookPages.map((page) => ({
    pageId: page.id,
    pageNumber: page.pageNumber,
    pageRole: page.pageRole,
    originalFilename: page.originalFilename,
    scriptBlocks: [],
    updatedAt: now,
  }));

  return {
    version: 1,
    status: "draft",
    speakers,
    pages,
    updatedAt: now,
  };
}

// ─── Normalize existing script ────────────────────────────────────────────────
// Merges existing script data with the current storybookPages list.
// Pages keyed by stable pageId — preserves all existing blocks.
// Adds entries for new pages; does not remove entries for deleted pages.

export function normalizeStorybookAudioScript(
  raw: unknown,
  storybookPages: StorybookPage[],
  featuredCharacters?: string[]
): StorybookAudioScript {
  const now = new Date().toISOString();

  if (!isRecord(raw)) {
    return buildDefaultStorybookAudioScript(storybookPages, featuredCharacters);
  }

  const status: StorybookAudioScriptStatus = VALID_SCRIPT_STATUSES.has(raw.status as StorybookAudioScriptStatus)
    ? (raw.status as StorybookAudioScriptStatus)
    : "draft";

  // Parse existing speakers, merge with defaults (defaults fill in missing ones)
  const rawSpeakers = Array.isArray(raw.speakers) ? raw.speakers : [];
  const existingSpeakers = rawSpeakers
    .map(parseSpeaker)
    .filter((s): s is StorybookAudioSpeaker => s !== null);

  const existingSpeakerSlugs = new Set(existingSpeakers.map((s) => s.speakerSlug));
  const defaultSpeakers = getDefaultStorybookSpeakers(featuredCharacters);
  const missingSpeakers = defaultSpeakers.filter((s) => !existingSpeakerSlugs.has(s.speakerSlug));
  const speakers: StorybookAudioSpeaker[] = [...existingSpeakers, ...missingSpeakers];

  // Build page map from existing raw pages
  const rawPages = Array.isArray(raw.pages) ? raw.pages : [];
  const existingPageMap = new Map<string, StorybookAudioScriptPage>();
  for (const rawPage of rawPages) {
    const parsed = parsePage(rawPage);
    if (parsed) existingPageMap.set(parsed.pageId, parsed);
  }

  // Build ordered pages from current storybookPages, preserving existing block data
  const pageIdsSeen = new Set<string>();
  const pages: StorybookAudioScriptPage[] = storybookPages.map((sbPage) => {
    pageIdsSeen.add(sbPage.id);
    const existing = existingPageMap.get(sbPage.id);
    return {
      pageId: sbPage.id,
      pageNumber: sbPage.pageNumber,
      pageRole: sbPage.pageRole,
      originalFilename: sbPage.originalFilename,
      scriptBlocks: existing?.scriptBlocks ?? [],
      updatedAt: existing?.updatedAt,
    };
  });

  // Preserve pages that exist in the script but are no longer in storybookPages
  // (e.g., pages that were hidden but script was already written)
  for (const [pageId, existingPage] of existingPageMap) {
    if (!pageIdsSeen.has(pageId)) {
      pages.push(existingPage);
    }
  }

  return {
    version: 1,
    status,
    defaultNarratorVoiceId: typeof raw.defaultNarratorVoiceId === "string" ? raw.defaultNarratorVoiceId : undefined,
    speakers,
    pages,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now,
  };
}
