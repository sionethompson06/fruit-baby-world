import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Link from "next/link";
import { type Character } from "@/lib/content";
import {
  checkCharacterAssets,
  buildReadinessSummary,
  type CharacterAssetSummary,
  type AssetStatus,
  type AssetRecommendedUse,
} from "@/lib/characterAssets";
import type { UploadedReferenceAsset } from "@/app/api/reference-assets/upload-character-reference/route";
import CharacterReferenceUploadForm, {
  type CharacterOption,
} from "./CharacterReferenceUploadForm";
import CreateCharacterDraftForm from "./CreateCharacterDraftForm";
import ReferenceAssetReviewPanel from "./ReferenceAssetReviewPanel";
import CharacterApprovalPanel from "./CharacterApprovalPanel";
import PrimaryReferenceAssignPanel from "./PrimaryReferenceAssignPanel";
import OfficialCharacterProfileBuilder from "./OfficialCharacterProfileBuilder";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Character Canon Library | Story Studio",
};

// ─── Per-character visual fidelity notes ──────────────────────────────────────────────

const CHARACTER_FIDELITY: Record<string, string[]> = {
  "pineapple-baby": [
    "Preserve sunny yellow/golden body and green leafy crown.",
    "Maintain warm friendly face, rounded baby-like shape, and kind expression.",
  ],
  "ube-baby": [
    "Preserve purple/lavender ube identity and gentle dreamy expression.",
    "Cozy magical feeling, rounded baby-like shape.",
  ],
  "kiwi-baby": [
    "Preserve fuzzy kiwi-brown body, green kiwi top, leaf crown, and white blossom accent.",
    "Maintain warm eyes, blush, and sweet smile.",
  ],
  "coconut-baby": [
    "Preserve warm coconut-brown and cream identity and calm comforting expression.",
    "Rounded baby-like shape.",
  ],
  "mango-baby": [
    "Preserve mango yellow/orange identity and playful joyful expression.",
    "Tropical green leaf accents, energetic baby-like personality.",
  ],
  tiki: [
    "Preserve carved wooden tiki body, leafy green crown, and orange/red band.",
    "Mischievous kid-friendly expression — must remain funny, dramatic, sneaky, and kid-friendly.",
    "Do not make Tiki scary, violent, horror-like, cruel, evil, or too intense.",
  ],
};

const GLOBAL_FIDELITY_RULES = [
  "Official character profile images are the visual source of truth.",
  "Canonical character JSON is the data source of truth.",
  "Future generated images and videos must be reference-anchored.",
  "Characters must not be redesigned.",
  "Body shape, silhouette, proportions, facial style, colors, accessories, and fruit identity must be preserved.",
  "Generated media must remain kid-friendly.",
  "Public users should not freely generate or remix official characters.",
  "Human review is required before generated media is published.",
];

// ─── Reference asset loader ─────────────────────────────────────────────────────────────

function loadUploadedReferenceAssets(): UploadedReferenceAsset[] {
  const filePath = path.join(
    process.cwd(),
    "src/content/reference-assets/character-reference-assets.json"
  );
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as { assets?: unknown[] };
    if (!Array.isArray(parsed.assets)) return [];
    return parsed.assets.filter(
      (a): a is UploadedReferenceAsset =>
        typeof a === "object" && a !== null && "id" in a && "characterSlug" in a
    );
  } catch {
    return [];
  }
}

// ─── Admin character loader (includes drafts from disk) ─────────────────────────────────

function loadAllAdminCharacters(): Character[] {
  const dir = path.join(process.cwd(), "src/content/characters");
  try {
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort();
    return files.map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf8");
      return JSON.parse(raw) as Character;
    });
  } catch {
    // Fallback: read each known official file individually
    const known = [
      "pineapple-baby",
      "ube-baby",
      "mango-baby",
      "kiwi-baby",
      "coconut-baby",
      "tiki",
    ];
    return known.flatMap((slug) => {
      try {
        const raw = fs.readFileSync(
          path.join(process.cwd(), "src/content/characters", `${slug}.json`),
          "utf8"
        );
        return [JSON.parse(raw) as Character];
      } catch {
        return [];
      }
    });
  }
}

// ─── Layout primitives ──────────────────────────────────────────────────────────────────

function Pill({
  children,
  className = "bg-tiki-brown/8 text-tiki-brown/60",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}

function StatusRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-tiki-brown/6 last:border-0">
      <dt className="text-xs text-tiki-brown/45 font-semibold">{label}</dt>
      <dd
        className={`text-xs font-bold ${
          positive === true
            ? "text-tropical-green"
            : positive === false
            ? "text-warm-coral/70"
            : "text-tiki-brown/65"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

// ─── Asset status badge ────────────────────────────────────────────────────────────────────

function recommendedUseLabel(use: AssetRecommendedUse): string {
  switch (use) {
    case "primary-reference": return "Primary Reference";
    case "fallback-reference": return "Fallback Reference";
    case "display-only": return "Display Only";
    case "missing": return "Missing";
    case "invalid": return "Invalid";
    case "do-not-use": return "Do Not Use";
  }
}

function recommendedUseBadgeClass(use: AssetRecommendedUse): string {
  switch (use) {
    case "primary-reference": return "bg-tropical-green/15 text-tropical-green";
    case "fallback-reference": return "bg-sky-blue/20 text-tiki-brown/70";
    case "display-only": return "bg-tiki-brown/8 text-tiki-brown/55";
    case "missing": return "bg-tiki-brown/8 text-tiki-brown/40";
    case "invalid":
    case "do-not-use": return "bg-warm-coral/20 text-warm-coral/80";
  }
}

function AssetBadge({ use }: { use: AssetRecommendedUse }) {
  return (
    <span
      className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${recommendedUseBadgeClass(use)}`}
    >
      {recommendedUseLabel(use)}
    </span>
  );
}

// ─── Asset integrity table ────────────────────────────────────────────────────────────────

function AssetIntegrityTable({ assets }: { assets: AssetStatus[] }) {
  return (
    <div className="flex flex-col gap-2">
      {assets.map((asset) => (
        <div
          key={asset.field}
          className={`border rounded-xl p-3 flex flex-col gap-1.5 ${
            asset.valid
              ? "border-tropical-green/20 bg-tropical-green/4"
              : asset.exists
              ? "border-warm-coral/25 bg-warm-coral/5"
              : "border-tiki-brown/10 bg-tiki-brown/3"
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-tiki-brown/70">{asset.label}</span>
            <span className="text-xs font-mono text-tiki-brown/35 bg-white/60 px-1.5 py-0.5 rounded">
              {asset.field}
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              {asset.valid ? (
                <span className="text-xs font-bold text-tropical-green bg-tropical-green/15 px-2 py-0.5 rounded-full">
                  Valid
                </span>
              ) : asset.exists ? (
                <span className="text-xs font-bold text-warm-coral/80 bg-warm-coral/15 px-2 py-0.5 rounded-full">
                  Invalid
                </span>
              ) : (
                <span className="text-xs font-bold text-tiki-brown/40 bg-tiki-brown/8 px-2 py-0.5 rounded-full">
                  {asset.path ? "Missing" : "Not Configured"}
                </span>
              )}
              <AssetBadge use={asset.recommendedUse} />
            </div>
          </div>

          {asset.path ? (
            <p className="text-xs font-mono text-tiki-brown/45 break-all">{asset.path}</p>
          ) : (
            <p className="text-xs text-tiki-brown/30 italic">No path configured</p>
          )}

          {asset.sizeBytes !== undefined && (
            <p className="text-xs text-tiki-brown/40">
              {asset.sizeBytes.toLocaleString()} bytes
            </p>
          )}

          {asset.issue && (
            <p className="text-xs text-warm-coral/80 font-semibold">{asset.issue}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Character reference card ─────────────────────────────────────────────────────────────────

function CharacterReferenceCard({
  character,
  assetSummary,
}: {
  character: Character;
  assetSummary: CharacterAssetSummary;
}) {
  const isTiki = character.type === "villain";
  const fidelityNotes = CHARACTER_FIDELITY[character.id] ?? [];

  const profileAsset = assetSummary.assets.find((a) => a.field === "image.profileSheet");
  const mainAsset = assetSummary.assets.find((a) => a.field === "image.main");

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm overflow-hidden">

      {/* Card header */}
      <div
        className={`px-6 py-5 border-b border-tiki-brown/8 ${
          isTiki ? "bg-warm-coral/6" : "bg-pineapple-yellow/8"
        }`}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Pill
                className={
                  isTiki
                    ? "bg-warm-coral/20 text-tiki-brown"
                    : "bg-tropical-green/15 text-tropical-green"
                }
              >
                {isTiki ? "Rival Character" : "Fruit Baby"}
              </Pill>
              <Pill className="bg-tiki-brown/8 text-tiki-brown/55">{character.status}</Pill>
              {character.status === "draft" && (
                <>
                  <Pill className="bg-warm-coral/20 text-warm-coral/80">Private</Pill>
                  <Pill className="bg-warm-coral/15 text-warm-coral/70">Not Approved</Pill>
                </>
              )}
              {assetSummary.readyForReferenceAnchoredGeneration ? (
                <Pill className="bg-tropical-green/15 text-tropical-green">
                  Reference-Ready
                </Pill>
              ) : (
                <Pill className="bg-warm-coral/20 text-warm-coral/80">
                  Missing References
                </Pill>
              )}
            </div>
            <h2 className="text-xl font-black text-tiki-brown leading-tight">{character.name}</h2>
            {character.role && (
              <p className="text-xs text-tiki-brown/55 mt-0.5">{character.role}</p>
            )}
          </div>
          <Link
            href={`/characters/${character.slug}`}
            className="text-xs font-bold text-ube-purple hover:text-ube-purple/70 transition-colors whitespace-nowrap"
          >
            View Public Profile →
          </Link>
        </div>
        {character.tagline && (
          <p className="text-xs italic text-tiki-brown/50 mt-2">"{character.tagline}"</p>
        )}
      </div>

      <div className="p-6 flex flex-col gap-6">

        {/* Warnings */}
        {assetSummary.warnings.length > 0 && (
          <div className="flex flex-col gap-2">
            {assetSummary.warnings.map((w) => (
              <div
                key={w}
                className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-4 py-3"
              >
                <span className="text-base flex-shrink-0">⚠️</span>
                <p className="text-xs font-semibold text-tiki-brown/75 leading-relaxed">{w}</p>
              </div>
            ))}
          </div>
        )}

        {/* Profile sheet */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
            Official Profile Sheet Reference
          </p>
          {profileAsset?.valid ? (
            <div className="border border-tiki-brown/10 rounded-2xl overflow-hidden bg-bg-cream p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={character.image.profileSheet!}
                alt={character.image.alt}
                className="w-full max-h-[28rem] object-contain"
              />
              <p className="text-xs text-tiki-brown/30 font-mono mt-2 text-center truncate">
                {character.image.profileSheet}
              </p>
            </div>
          ) : (
            <div className="border border-tiki-brown/10 rounded-2xl bg-tiki-brown/3 flex flex-col items-center justify-center h-36 gap-2">
              <span className="text-2xl select-none opacity-30">🖼️</span>
              <p className="text-xs font-bold text-tiki-brown/35 uppercase tracking-wide">
                {profileAsset?.issue ?? "Profile sheet not added yet"}
              </p>
            </div>
          )}
        </div>

        {/* Main image */}
        {mainAsset && mainAsset.path && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
              Isolated Main Image
            </p>
            {mainAsset.valid ? (
              <div className="border border-tiki-brown/10 rounded-2xl overflow-hidden bg-bg-cream p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={character.image.main}
                  alt={character.image.alt}
                  className="w-full max-h-60 object-contain"
                />
                <p className="text-xs text-tiki-brown/30 font-mono mt-2 text-center truncate">
                  {character.image.main}
                </p>
              </div>
            ) : (
              <div className="border border-warm-coral/20 rounded-2xl bg-warm-coral/5 flex flex-col items-center justify-center h-28 gap-2 px-4">
                <span className="text-xl select-none">🚫</span>
                <p className="text-xs font-bold text-warm-coral/70 uppercase tracking-wide text-center">
                  Invalid image — not rendered
                </p>
                <p className="text-xs text-tiki-brown/50 font-mono text-center truncate max-w-full">
                  {character.image.main}
                </p>
                {mainAsset.issue && (
                  <p className="text-xs text-warm-coral/65 text-center leading-snug">
                    {mainAsset.issue}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reference Asset Integrity */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🔍</span>
            <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
              Reference Asset Integrity
            </p>
          </div>
          <dl className="flex flex-col border border-tiki-brown/8 rounded-xl overflow-hidden">
            <StatusRow label="Valid Main Image" value={assetSummary.hasValidMainImage ? "Yes" : "No"} positive={assetSummary.hasValidMainImage} />
            <StatusRow label="Valid Profile Sheet" value={assetSummary.hasValidProfileSheet ? "Yes" : "No"} positive={assetSummary.hasValidProfileSheet} />
            <StatusRow label="Valid Character Sheet" value={assetSummary.hasValidCharacterSheet ? "Yes" : "Not configured"} positive={assetSummary.hasValidCharacterSheet || undefined} />
            <StatusRow label="Has Any Valid Reference" value={assetSummary.hasAnyValidReference ? "Yes" : "No"} positive={assetSummary.hasAnyValidReference} />
            <StatusRow label="Ready for Reference-Anchored Generation" value={assetSummary.readyForReferenceAnchoredGeneration ? "Yes" : "No — needs valid reference"} positive={assetSummary.readyForReferenceAnchoredGeneration} />
            <StatusRow label="Recommended Primary Reference" value={assetSummary.bestReferenceField ?? "None available"} positive={assetSummary.bestReferenceField !== null || undefined} />
          </dl>
          <AssetIntegrityTable assets={assetSummary.assets} />
        </div>

        {/* Legacy asset status */}
        <div>
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-2">Asset Status</p>
          <dl className="flex flex-col">
            <StatusRow label="Character JSON" value="Available" positive={true} />
            <StatusRow label="Profile Sheet" value={assetSummary.hasValidProfileSheet ? "Valid" : profileAsset?.exists ? "Invalid" : "Missing"} positive={assetSummary.hasValidProfileSheet} />
            <StatusRow label="Main Image" value={assetSummary.hasValidMainImage ? "Valid" : mainAsset?.exists ? "Invalid" : mainAsset?.path ? "Missing on disk" : "Not configured"} positive={assetSummary.hasValidMainImage ? true : mainAsset?.path ? false : undefined} />
            <StatusRow label="Approved for Reference Use" value={assetSummary.readyForReferenceAnchoredGeneration ? "Yes" : "No — valid reference asset needed"} positive={assetSummary.readyForReferenceAnchoredGeneration} />
          </dl>
        </div>

        {/* Visual identity */}
        {character.visualIdentity?.styleNotes && (
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">Visual Identity</p>
            <p className="text-sm text-tiki-brown/70 leading-relaxed">{character.visualIdentity.styleNotes}</p>
            {character.visualIdentity.palette && character.visualIdentity.palette.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {character.visualIdentity.palette.map((swatch) => (
                  <div key={swatch.hex} className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full border border-tiki-brown/15 flex-shrink-0" style={{ backgroundColor: swatch.hex }} />
                    <span className="text-xs text-tiki-brown/50 font-mono">{swatch.hex}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Personality */}
        {character.personality?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">Personality</p>
            <div className="flex flex-wrap gap-1.5">
              {character.personality.map((trait) => (
                <span key={trait} className="text-xs px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple font-semibold">{trait}</span>
              ))}
            </div>
          </div>
        )}

        {/* Expressions */}
        {character.expressions && character.expressions.length > 0 && (
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">Expressions</p>
            <div className="flex flex-wrap gap-1.5">
              {character.expressions.map((expr) => (
                <span key={expr} className="text-xs px-2.5 py-0.5 rounded-full bg-sky-blue/20 text-tiki-brown/65 font-semibold">{expr}</span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {character.shortDescription && (
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">Description</p>
            <p className="text-sm text-tiki-brown/70 leading-relaxed">{character.shortDescription}</p>
          </div>
        )}

        {/* Character rules */}
        <div className="grid gap-3 sm:grid-cols-2">
          {(character.characterRules?.always?.length ?? 0) > 0 && (
            <div className="bg-tropical-green/6 border border-tropical-green/15 rounded-xl p-4">
              <p className="text-xs font-bold text-tropical-green/80 uppercase tracking-wide mb-2">Always</p>
              <ul className="space-y-1">
                {character.characterRules.always.map((rule) => (
                  <li key={rule} className="flex items-start gap-2 text-xs text-tiki-brown/65 leading-relaxed">
                    <span className="flex-shrink-0 text-tropical-green/60 mt-0.5">✓</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(character.characterRules?.never?.length ?? 0) > 0 && (
            <div className="bg-warm-coral/6 border border-warm-coral/15 rounded-xl p-4">
              <p className="text-xs font-bold text-warm-coral/80 uppercase tracking-wide mb-2">Never</p>
              <ul className="space-y-1">
                {character.characterRules.never.map((rule) => (
                  <li key={rule} className="flex items-start gap-2 text-xs text-tiki-brown/65 leading-relaxed">
                    <span className="flex-shrink-0 text-warm-coral/60 mt-0.5">✕</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Visual fidelity reminder */}
        {fidelityNotes.length > 0 && (
          <div className="bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl p-4">
            <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide mb-2">Visual Fidelity Reminder</p>
            <ul className="space-y-1">
              {fidelityNotes.map((note) => (
                <li key={note} className="flex items-start gap-2 text-xs text-tiki-brown/70 leading-relaxed">
                  <span className="flex-shrink-0 text-pineapple-yellow/70 mt-0.5">•</span>
                  {note}
                </li>
              ))}
            </ul>
            {isTiki && (
              <div className="mt-3 flex items-start gap-2 bg-warm-coral/10 border border-warm-coral/20 rounded-lg px-3 py-2">
                <span className="text-sm flex-shrink-0">⚡</span>
                <p className="text-xs text-tiki-brown/70 leading-relaxed">
                  <strong className="font-bold">Tiki Trouble guardrail:</strong> Must remain mischievous, funny, dramatic, and kid-friendly.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Future generation readiness */}
        <div>
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-2">Future Generation Readiness</p>
          <dl className="flex flex-col">
            <StatusRow label="Story Panel Prompts" value="Yes — use scene data" positive={true} />
            <StatusRow label="Animation Prompts" value="Yes — use scene data" positive={true} />
            <StatusRow label="Reference-Anchored Generation" value={assetSummary.readyForReferenceAnchoredGeneration ? `Ready — use ${assetSummary.bestReferenceField ?? "available reference"}` : "Not ready — no valid reference asset"} positive={assetSummary.readyForReferenceAnchoredGeneration} />
            <StatusRow label="Public Variation Generation" value="Not Allowed" positive={false} />
            <StatusRow label="Admin Approval Required" value="Yes" positive={true} />
          </dl>
        </div>

        {/* Signature quote */}
        {(character.signatureQuote || character.favoriteQuote) && (
          <div className="text-center px-2 pt-1">
            <p className="text-sm italic text-tiki-brown/50 leading-relaxed">
              "{character.signatureQuote ?? character.favoriteQuote}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────────────────

const OFFICIAL_CHARACTER_SLUGS = new Set([
  "pineapple-baby",
  "ube-baby",
  "mango-baby",
  "kiwi-baby",
  "coconut-baby",
  "tiki",
]);

export default function AdminCharactersPage() {
  const characters = loadAllAdminCharacters();
  const assetSummaries = characters.map(checkCharacterAssets);
  const readiness = buildReadinessSummary(assetSummaries);
  const uploadedAssets = loadUploadedReferenceAssets();

  const officialCharacters = characters.filter((c) => c.status === "active");
  const draftCharacters = characters.filter((c) => c.status === "draft");

  const characterOptions: CharacterOption[] = characters.map((c) => ({
    slug: c.slug,
    name: c.name,
    isDraft:
      c.status === "draft" ||
      c.approvalMode === "draft" ||
      (!c.approvalMode &&
        c.status !== "active" &&
        c.publicUseAllowed !== true),
  }));

  const approvedRefCounts: Record<string, number> = {};
  const approvedRefsBySlug: Record<string, UploadedReferenceAsset[]> = {};
  for (const c of characters) {
    const approved = uploadedAssets.filter(
      (a) =>
        a.characterSlug === c.slug &&
        a.reviewStatus === "approved-for-generation" &&
        a.approvedForGeneration === true &&
        a.generationUseAllowed === true
    );
    approvedRefCounts[c.slug] = approved.length;
    approvedRefsBySlug[c.slug] = approved;
  }

  const builtInRefValid: Record<string, boolean> = {};
  for (let i = 0; i < characters.length; i++) {
    builtInRefValid[characters[i].slug] = assetSummaries[i].hasAnyValidReference;
  }

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* Header */}
      <section className="bg-gradient-to-b from-pineapple-yellow/25 via-bg-cream to-bg-cream py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">Admin Only</span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-tiki-brown/10 text-tiki-brown/60 uppercase tracking-widest">Read-Only</span>
          </div>
          <div className="text-4xl mb-3">📚</div>
          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">Character Canon Library</h1>
          <p className="text-tiki-brown/70 text-base leading-relaxed max-w-xl">
            Review official Fruit Baby character data, profile images, visual rules, and reference asset integrity for future media generation.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 pb-16 flex flex-col gap-6">

        <div className="flex items-start gap-3 bg-white border border-pineapple-yellow/40 rounded-2xl px-5 py-4 shadow-sm">
          <span className="text-xl flex-shrink-0">📋</span>
          <p className="text-sm text-tiki-brown/65 leading-relaxed">
            <strong className="text-tiki-brown font-bold">Admin only. </strong>
            Character editing, image generation, and variation generation are not active yet.
            You can create new character drafts and upload reference guide files below.
            Official character canon is managed via JSON files.
          </p>
        </div>

        {/* Create New Character Draft */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h2 className="text-base font-black text-tiki-brown">Create New Character Draft</h2>
            <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">Admin Only</span>
          </div>
          <p className="text-sm text-tiki-brown/60 leading-relaxed">
            Create a new character profile draft. New characters are{" "}
            <strong className="font-semibold">private by default</strong> and are not approved for
            stories or generation until reference assets are uploaded and reviewed in a future phase.
            A Vercel redeploy is required for the character to appear in admin lists.
          </p>
          <CreateCharacterDraftForm />
        </div>

        {/* Upload Character Reference File */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">⬆️</span>
            <h2 className="text-base font-black text-tiki-brown">Upload Character Reference File</h2>
            <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">Admin Only</span>
          </div>
          <p className="text-sm text-tiki-brown/60 leading-relaxed">
            Upload PNG, JPEG, or WebP reference guide images (character sheets, expression sheets,
            profile art) to Vercel Blob. Uploaded assets default to{" "}
            <strong className="font-semibold">approvedForGeneration: false</strong> and require human
            review before use. Nothing is published automatically.
          </p>
          <CharacterReferenceUploadForm characters={characterOptions} />
        </div>

        {/* Review Uploaded Reference Assets */}
        <ReferenceAssetReviewPanel
          initialAssets={uploadedAssets}
          draftSlugs={new Set(draftCharacters.map((c) => c.slug))}
        />

        {/* Primary Official Reference Assignment */}
        <PrimaryReferenceAssignPanel
          characters={characters}
          approvedRefsBySlug={approvedRefsBySlug}
        />

        {/* Official Character Profile Builder */}
        <OfficialCharacterProfileBuilder
          characters={characters}
          approvedRefsBySlug={approvedRefsBySlug}
        />

        {/* Character Approval */}
        <CharacterApprovalPanel
          characters={characters}
          approvedRefCounts={approvedRefCounts}
          builtInRefValid={builtInRefValid}
          officialSlugs={OFFICIAL_CHARACTER_SLUGS}
        />

        {/* Reference Asset Readiness Summary */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔍</span>
            <h2 className="text-base font-black text-tiki-brown">Reference Asset Integrity Summary</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(
              [
                ["Total Characters", String(readiness.totalCharacters), undefined],
                ["Reference-Ready", String(readiness.readyCount), readiness.readyCount === readiness.totalCharacters],
                ["Missing Valid References", String(readiness.notReadyCount), readiness.notReadyCount === 0 ? true : false],
                ["Invalid Asset References", String(readiness.invalidAssetCount), readiness.invalidAssetCount === 0 ? true : false],
                ["Profile Sheets Available", String(readiness.profileSheetsAvailable), readiness.profileSheetsAvailable === readiness.totalCharacters],
              ] as [string, string, boolean | undefined][]
            ).map(([label, value, positive]) => (
              <div key={label} className={`flex flex-col items-center gap-0.5 rounded-2xl px-4 py-3 text-center border ${
                positive === true ? "bg-tropical-green/8 border-tropical-green/20" : positive === false ? "bg-warm-coral/8 border-warm-coral/20" : "bg-tiki-brown/4 border-tiki-brown/8"
              }`}>
                <span className={`text-xl font-black ${
                  positive === true ? "text-tropical-green" : positive === false ? "text-warm-coral/80" : "text-tiki-brown"
                }`}>{value}</span>
                <span className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide leading-tight">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-3 bg-sky-blue/8 border border-sky-blue/20 rounded-xl px-4 py-4">
            <span className="text-base flex-shrink-0">💡</span>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-bold text-tiki-brown/65 uppercase tracking-wide">About Reference-Anchored Generation</p>
              <p className="text-sm text-tiki-brown/70 leading-relaxed">Future reference-anchored image generation should use valid official profile sheets, isolated main images, and character sheets as visual source references.</p>
              <p className="text-sm text-tiki-brown/70 leading-relaxed">Before reference-anchored generation is enabled, every character used in a scene should have at least one valid official reference asset.</p>
            </div>
          </div>
          {readiness.invalidAssetCount > 0 && (
            <div className="flex items-start gap-3 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-4 py-3">
              <span className="text-base flex-shrink-0">⚠️</span>
              <p className="text-sm text-tiki-brown/70 leading-relaxed">
                <strong className="font-bold">{readiness.invalidAssetCount} invalid asset reference{readiness.invalidAssetCount !== 1 ? "s" : ""} found.</strong>{" "}
                Invalid files exist on disk but fail image validation.
              </p>
            </div>
          )}
        </div>

        {/* Legacy summary stats */}
        <div className="flex flex-wrap gap-3">
          {([
            ["Characters", String(characters.length)],
            ["Fruit Babies", String(characters.filter((c) => c.type === "fruit-baby").length)],
            ["Rival Characters", String(characters.filter((c) => c.type === "villain").length)],
            ["Profile Sheets", String(readiness.profileSheetsAvailable)],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="flex flex-col items-center gap-0.5 bg-white border border-tiki-brown/10 rounded-2xl px-5 py-3 min-w-[7rem] text-center shadow-sm">
              <span className="text-xl font-black text-tiki-brown">{value}</span>
              <span className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide leading-tight">{label}</span>
            </div>
          ))}
        </div>

        {/* Official character reference cards */}
        {officialCharacters.length > 0 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="text-base">🌟</span>
              <h2 className="text-sm font-black text-tiki-brown/70 uppercase tracking-wide">Official Characters ({officialCharacters.length})</h2>
            </div>
            {officialCharacters.map((character) => {
              const i = characters.findIndex((c) => c.id === character.id);
              return <CharacterReferenceCard key={character.id} character={character} assetSummary={assetSummaries[i]} />;
            })}
          </div>
        )}

        {/* Draft character cards */}
        {draftCharacters.length > 0 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="text-base">📝</span>
              <h2 className="text-sm font-black text-tiki-brown/70 uppercase tracking-wide">Draft Characters ({draftCharacters.length})</h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral/80 uppercase tracking-wide">Private</span>
            </div>
            <div className="flex items-start gap-3 bg-tiki-brown/4 border border-tiki-brown/10 rounded-xl px-4 py-3">
              <span className="text-sm flex-shrink-0">🔒</span>
              <p className="text-xs text-tiki-brown/55 leading-relaxed">Draft characters are private and not approved for stories or generation.</p>
            </div>
            {draftCharacters.map((character) => {
              const i = characters.findIndex((c) => c.id === character.id);
              return <CharacterReferenceCard key={character.id} character={character} assetSummary={assetSummaries[i]} />;
            })}
          </div>
        )}

        {/* Global character fidelity rules */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔒</span>
            <h2 className="text-base font-black text-tiki-brown">Global Character Fidelity Rules</h2>
          </div>
          <ul className="space-y-2">
            {GLOBAL_FIDELITY_RULES.map((rule) => (
              <li key={rule} className="flex items-start gap-2.5 text-sm text-tiki-brown/70 leading-relaxed">
                <span className="flex-shrink-0 text-ube-purple/60 mt-0.5">•</span>
                {rule}
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 bg-warm-coral/8 border border-warm-coral/20 rounded-xl px-4 py-3">
            <span className="text-base flex-shrink-0">⚡</span>
            <p className="text-sm text-tiki-brown/70 leading-relaxed">
              <strong className="font-bold">Tiki Trouble:</strong> Must remain mischievous, funny, dramatic, and kid-friendly in all generated media.
            </p>
          </div>
        </div>

        {/* Future use */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
          <h2 className="text-base font-black text-tiki-brown">Future Use</h2>
          <ul className="space-y-2">
            {[
              "These references will later support story panel generation using official profile images.",
              "These references will later support animation clip generation with character-anchored prompts.",
              "These references will later support admin-only character variation generation.",
              "No generation tools are active on this page yet.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-tiki-brown/70 leading-relaxed">
                <span className="flex-shrink-0 text-tropical-green/60 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 bg-tiki-brown/4 rounded-xl px-4 py-3">
            <span className="text-base flex-shrink-0">🎨</span>
            <p className="text-sm text-tiki-brown/65 leading-relaxed">
              Future character variation tools will live in{" "}
              <Link href="/admin/variations" className="font-bold text-ube-purple hover:text-ube-purple/70 transition-colors">/admin/variations</Link>.
              Variation generation is not active yet.
            </p>
          </div>
        </div>

      </section>
    </div>
  );
}
