// Helpers for storybook narration audio — both single-file and sequence modes.

import type {
  StorybookNarrationAudio,
  StorybookNarrationSequence,
  StorybookNarrationSequenceBlock,
} from "@/lib/storybookAudioTypes";
import type { StorybookAudioScript } from "@/lib/storybookAudioScriptTypes";
import type { StorybookPage } from "@/lib/storybookPageTypes";
import { getFullBookAudioSequence } from "@/lib/storybookAudioScript";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// ─── isStorybookNarrationPublic ───────────────────────────────────────────────

/**
 * Returns true if narration should be shown publicly.
 * Works for both single-file and sequence mode.
 */
export function isStorybookNarrationPublic(
  narration: StorybookNarrationAudio | null | undefined
): boolean {
  if (!narration) return false;
  if (narration.visibility !== "public") return false;
  if (narration.status === "archived") return false;

  const mode = narration.mode ?? "single-file";

  if (mode === "sequence") {
    return (
      Array.isArray(narration.sequence?.blocks) &&
      narration.sequence!.blocks.length > 0
    );
  }

  // single-file (or no mode)
  return typeof narration.audioUrl === "string" && narration.audioUrl.length > 0;
}

// ─── buildNarrationSequenceFromAudioScript ────────────────────────────────────

/**
 * Builds a StorybookNarrationSequence from approved script data.
 * Only includes pages in storybookPages order, blocks with audioUrl, non-archived.
 * Returns null if no blocks qualify.
 */
export function buildNarrationSequenceFromAudioScript(
  script: StorybookAudioScript,
  storybookPages: StorybookPage[]
): StorybookNarrationSequence | null {
  const fullSequence = getFullBookAudioSequence(script, storybookPages);

  // Filter to blocks that have audio URLs (non-archived + non-empty text already handled by getFullBookAudioSequence)
  const qualifiedItems = fullSequence.filter((item) => !!item.block.audioUrl);

  if (qualifiedItems.length === 0) return null;

  const pageIds = Array.from(new Set(qualifiedItems.map((item) => item.pageId)));

  const blocks: StorybookNarrationSequenceBlock[] = qualifiedItems.map(
    (item, i) => ({
      pageId: item.pageId,
      blockId: item.block.id,
      speakerSlug: item.block.speakerSlug,
      speakerName: item.block.speakerName,
      audioUrl: item.block.audioUrl!,
      pathname: item.block.pathname,
      sortOrder: i,
    })
  );

  return {
    source: "storybookAudioScript",
    generatedFromScriptAt: new Date().toISOString(),
    pageIds,
    blocks,
  };
}

// ─── normalizeStorybookNarration ──────────────────────────────────────────────

/**
 * Normalizes raw JSON into StorybookNarrationAudio, handling both modes.
 * Returns null if the data is invalid or missing required fields.
 *
 * For sequence mode, audioUrl may be a backward-compat fallback (first block's
 * URL set by the publish route). We allow sequence narrations where audioUrl is
 * absent by falling back to the first block URL so valid sequence narrations
 * are not incorrectly rejected.
 */
export function normalizeStorybookNarration(
  raw: unknown
): StorybookNarrationAudio | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.mimeType !== "string" || !raw.mimeType) return null;

  // Determine mode early so we can compute audioUrl fallback for sequence mode
  const mode =
    raw.mode === "sequence" ? ("sequence" as const) : ("single-file" as const);

  // For sequence mode, derive audioUrl from the first block if not present
  let resolvedAudioUrl: string = typeof raw.audioUrl === "string" ? raw.audioUrl : "";
  if (!resolvedAudioUrl && mode === "sequence" && isRecord(raw.sequence)) {
    const rawSeq = raw.sequence;
    const rawBlocks = Array.isArray(rawSeq.blocks) ? rawSeq.blocks : [];
    const firstBlock = rawBlocks.find(
      (b): b is Record<string, unknown> =>
        isRecord(b) && typeof (b as Record<string, unknown>).audioUrl === "string"
    );
    if (firstBlock) {
      resolvedAudioUrl = firstBlock.audioUrl as string;
    }
  }

  // Reject if still no audioUrl (single-file always needs one; sequence needs
  // at least one block URL, checked above)
  if (!resolvedAudioUrl) return null;

  const status =
    raw.status === "approved" || raw.status === "archived"
      ? (raw.status as "approved" | "archived")
      : ("draft" as const);

  const visibility =
    raw.visibility === "public" ? ("public" as const) : ("hidden" as const);

  const sourceType =
    raw.sourceType === "legacy-generated"
      ? ("legacy-generated" as const)
      : ("admin-uploaded" as const);

  let sequence: StorybookNarrationSequence | undefined = undefined;
  if (mode === "sequence" && isRecord(raw.sequence)) {
    const rawSeq = raw.sequence;
    const pageIds = Array.isArray(rawSeq.pageIds)
      ? rawSeq.pageIds.filter((id): id is string => typeof id === "string")
      : [];
    const rawBlocks = Array.isArray(rawSeq.blocks) ? rawSeq.blocks : [];
    const blocks: StorybookNarrationSequenceBlock[] = rawBlocks
      .filter(isRecord)
      .filter(
        (b) =>
          typeof b.pageId === "string" &&
          typeof b.blockId === "string" &&
          typeof b.audioUrl === "string"
      )
      .map((b, i) => ({
        pageId: b.pageId as string,
        blockId: b.blockId as string,
        speakerSlug:
          typeof b.speakerSlug === "string" ? b.speakerSlug : "narrator",
        speakerName:
          typeof b.speakerName === "string" ? b.speakerName : "Narrator",
        audioUrl: b.audioUrl as string,
        pathname:
          typeof b.pathname === "string" ? b.pathname : undefined,
        sortOrder: typeof b.sortOrder === "number" ? b.sortOrder : i,
      }));
    if (blocks.length > 0) {
      sequence = {
        source: "storybookAudioScript",
        generatedFromScriptAt:
          typeof rawSeq.generatedFromScriptAt === "string"
            ? rawSeq.generatedFromScriptAt
            : new Date().toISOString(),
        pageIds,
        blocks,
      };
    }
  }

  return {
    id: raw.id,
    title: typeof raw.title === "string" ? raw.title : undefined,
    audioUrl: resolvedAudioUrl,
    pathname: typeof raw.pathname === "string" ? raw.pathname : undefined,
    mimeType: raw.mimeType,
    sizeBytes: typeof raw.sizeBytes === "number" ? raw.sizeBytes : undefined,
    durationSeconds:
      typeof raw.durationSeconds === "number" ? raw.durationSeconds : undefined,
    sourceType,
    status,
    visibility,
    createdAt:
      typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : undefined,
    mode,
    sequence,
    approvedAt: typeof raw.approvedAt === "string" ? raw.approvedAt : undefined,
  };
}

// ─── isStorybookNarrationSingleFile ──────────────────────────────────────────

/**
 * Returns true when the narration is in single-file mode (mode === "single-file"
 * or mode is absent but audioUrl is present — legacy records).
 */
export function isStorybookNarrationSingleFile(
  narration: StorybookNarrationAudio | null | undefined
): boolean {
  if (!narration) return false;
  const mode = narration.mode ?? "single-file";
  if (mode === "single-file") {
    return typeof narration.audioUrl === "string" && narration.audioUrl.length > 0;
  }
  return false;
}

// ─── isStorybookNarrationSequence ────────────────────────────────────────────

/**
 * Returns true when the narration is in sequence mode.
 */
export function isStorybookNarrationSequence(
  narration: StorybookNarrationAudio | null | undefined
): boolean {
  if (!narration) return false;
  return narration.mode === "sequence";
}

// ─── getStorybookNarrationPlayableBlockCount ──────────────────────────────────

/**
 * Returns the number of blocks that have an audioUrl.
 * - sequence: blocks.filter(b => b.audioUrl).length
 * - single-file: 1 if audioUrl present, else 0
 * - null / missing: 0
 */
export function getStorybookNarrationPlayableBlockCount(
  narration: StorybookNarrationAudio | null | undefined
): number {
  if (!narration) return 0;
  const mode = narration.mode ?? "single-file";
  if (mode === "sequence") {
    if (!Array.isArray(narration.sequence?.blocks)) return 0;
    return narration.sequence!.blocks.filter((b) => !!b.audioUrl).length;
  }
  // single-file
  return typeof narration.audioUrl === "string" && narration.audioUrl.length > 0 ? 1 : 0;
}

// ─── getStorybookNarrationSummary ─────────────────────────────────────────────

/**
 * Returns a human-readable one-line summary of the narration state.
 *
 * Possible values:
 * - "No public audio"          — null, missing, or not public
 * - "Manual uploaded audio"    — single-file, public
 * - "Generated audio sequence — {N} blocks" — sequence, public
 * - "Draft audio (hidden)"     — has narration but not public
 */
export function getStorybookNarrationSummary(
  narration: StorybookNarrationAudio | null | undefined
): string {
  if (!narration) return "No public audio";

  const isPublic = isStorybookNarrationPublic(narration);

  if (!isPublic) {
    // Has a narration record but it's not publicly visible
    if (narration.status === "archived") return "No public audio";
    return "Draft audio (hidden)";
  }

  const mode = narration.mode ?? "single-file";
  if (mode === "sequence") {
    const n = getStorybookNarrationPlayableBlockCount(narration);
    return `Generated audio sequence — ${n} block${n !== 1 ? "s" : ""}`;
  }

  return "Manual uploaded audio";
}
