"use client";

import { useState } from "react";
import Link from "next/link";
import type { Character } from "@/lib/content";
import type { UploadedReferenceAsset } from "@/app/api/reference-assets/upload-character-reference/route";
import type { CharacterAssetSummary, AssetRecommendedUse } from "@/lib/characterAssets";
import { getOfficialProfileSheetUrl, PROFILE_SHEET_TYPES, MAIN_REFERENCE_TYPES, ENVIRONMENT_REFERENCE_TYPES } from "@/lib/characterProfileAssets";
import {
  getCharacterApprovalMode,
  getCharacterStatusBadgeClass,
  getCharacterStatusLabel,
  characterHasPrimaryReference,
  isReferenceAssetApproved,
} from "@/lib/characterReadiness";
import { AssetReviewCard } from "./ReferenceAssetReviewPanel";
import { CharacterBuilderRow, hasPrimaryRef } from "./OfficialProfileBuilderPanel";
import { CharacterApprovalRow } from "./CharacterApprovalPanel";

// ─── Per-character visual fidelity notes ─────────────────────────────────────

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

// ─── Asset integrity display helpers ─────────────────────────────────────────

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

// ─── Section toggle ───────────────────────────────────────────────────────────

function SectionToggle({
  label,
  open,
  onToggle,
  badge,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-5 py-3 text-left bg-tiki-brown/3 hover:bg-tiki-brown/5 transition-colors border-t border-tiki-brown/8"
    >
      <span className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide flex-1">
        {label}
      </span>
      {badge}
      <span className="text-xs text-tiki-brown/30">{open ? "▲" : "▼"}</span>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CharacterWorkspaceCard({
  character,
  uploadedAssets,
  approvedRefCount,
  builtInRefValid,
  isOfficialCharacter,
  assetSummary,
}: {
  character: Character;
  uploadedAssets: UploadedReferenceAsset[];
  approvedRefCount: number;
  builtInRefValid: boolean;
  isOfficialCharacter: boolean;
  assetSummary: CharacterAssetSummary;
}) {
  const [assets, setAssets] = useState(uploadedAssets);

  const approvalMode = getCharacterApprovalMode(character);
  const isDraft = approvalMode === "draft";
  const isTiki = character.type === "villain";
  const profileSheetUrl = getOfficialProfileSheetUrl(character);
  const hasRef = hasPrimaryRef(character);
  const hasPrimaryRef_ = characterHasPrimaryReference(character);

  const profileSheetAssets = assets.filter((a) => PROFILE_SHEET_TYPES.has(a.assetType ?? ""));
  const mainRefAssets = assets.filter((a) => MAIN_REFERENCE_TYPES.has(a.assetType ?? ""));
  const environmentAssets = assets.filter(
    (a) =>
      !PROFILE_SHEET_TYPES.has(a.assetType ?? "") &&
      !MAIN_REFERENCE_TYPES.has(a.assetType ?? "") &&
      ENVIRONMENT_REFERENCE_TYPES.has(a.assetType ?? "")
  );
  const supportingAssets = assets.filter(
    (a) =>
      !PROFILE_SHEET_TYPES.has(a.assetType ?? "") &&
      !MAIN_REFERENCE_TYPES.has(a.assetType ?? "") &&
      !ENVIRONMENT_REFERENCE_TYPES.has(a.assetType ?? "")
  );
  const pendingCount = assets.filter((a) => a.reviewStatus === "needs-review").length;
  const approvedSupportingCount = supportingAssets.filter((a) =>
    isReferenceAssetApproved(a as UploadedReferenceAsset & { reviewStatus?: string })
  ).length;
  const approvedEnvironmentCount = environmentAssets.filter((a) =>
    isReferenceAssetApproved(a as UploadedReferenceAsset & { reviewStatus?: string })
  ).length;
  const rejectedArchivedCount = assets.filter(
    (a) => a.reviewStatus === "rejected" || a.reviewStatus === "archived"
  ).length;
  const fidelityNotes = CHARACTER_FIDELITY[character.slug] ?? [];

  const [imagesOpen, setImagesOpen] = useState(true);
  const [refsOpen, setRefsOpen] = useState(assets.length > 0);
  const [builderOpen, setBuilderOpen] = useState(isDraft && hasRef);
  const [statusOpen, setStatusOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  function handleReviewed(updated: UploadedReferenceAsset) {
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  const mainAssetStatus = assetSummary.assets.find((a) => a.field === "image.main");

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className={`px-5 py-4 flex items-start gap-4 ${isTiki ? "bg-warm-coral/6" : "bg-pineapple-yellow/8"}`}>
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 rounded-2xl overflow-hidden border border-tiki-brown/10 bg-tiki-brown/4">
          {profileSheetUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profileSheetUrl}
              alt={character.image.alt}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center opacity-20 text-2xl select-none">
              🖼️
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${getCharacterStatusBadgeClass(character)}`}
            >
              {getCharacterStatusLabel(character)}
            </span>
            {isOfficialCharacter && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/65 uppercase tracking-wide">
                Official
              </span>
            )}
            {hasPrimaryRef_ ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/12 text-tropical-green uppercase tracking-wide">
                Ref Assigned ✓
              </span>
            ) : (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/40 uppercase tracking-wide">
                No Primary Ref
              </span>
            )}
            {assetSummary.readyForReferenceAnchoredGeneration ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
                Reference-Ready
              </span>
            ) : (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral/70 uppercase tracking-wide">
                Needs Reference
              </span>
            )}
          </div>
          <h2 className="text-lg font-black text-tiki-brown leading-tight">{character.name}</h2>
          {character.role && (
            <p className="text-xs text-tiki-brown/55 mt-0.5">{character.role}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            <span className="text-xs font-mono text-tiki-brown/35">{character.slug}</span>
            <span className="text-xs text-tiki-brown/40">
              Approved refs:{" "}
              <strong className={approvedRefCount > 0 ? "text-tropical-green" : "text-tiki-brown/35"}>
                {approvedRefCount}
              </strong>
            </span>
            <Link
              href={`/characters/${character.slug}`}
              className="text-xs font-bold text-ube-purple hover:text-ube-purple/70 transition-colors"
            >
              View Profile →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Asset warnings ── */}
      {assetSummary.warnings.length > 0 && (
        <div className="px-5 pt-4 pb-1 flex flex-col gap-2">
          {assetSummary.warnings.map((w) => (
            <div
              key={w}
              className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-4 py-3"
            >
              <span className="text-sm flex-shrink-0">⚠️</span>
              <p className="text-xs font-semibold text-tiki-brown/75 leading-relaxed">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Official Images section ── */}
      <SectionToggle
        label="Official Images"
        open={imagesOpen}
        onToggle={() => setImagesOpen((v) => !v)}
      />
      {imagesOpen && (
        <div className="px-5 py-4 flex flex-col gap-4 bg-tiki-brown/2">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">Profile Sheet</p>
            {profileSheetUrl ? (
              <div className="border border-tiki-brown/10 rounded-2xl overflow-hidden bg-bg-cream p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profileSheetUrl}
                  alt={character.image.alt}
                  className="w-full max-h-64 object-contain"
                />
                <p className="text-xs text-tiki-brown/30 font-mono mt-2 text-center truncate">
                  {profileSheetUrl}
                </p>
              </div>
            ) : (
              <div className="border border-tiki-brown/10 rounded-2xl bg-tiki-brown/3 flex flex-col items-center justify-center h-24 gap-2">
                <span className="text-2xl opacity-20 select-none">🖼️</span>
                <p className="text-xs font-bold text-tiki-brown/35 uppercase tracking-wide">
                  No profile sheet configured
                </p>
              </div>
            )}
          </div>

          {character.image.main && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
                Isolated Main Image
              </p>
              {mainAssetStatus?.valid ? (
                <div className="border border-tiki-brown/10 rounded-2xl overflow-hidden bg-bg-cream p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={character.image.main}
                    alt={character.image.alt}
                    className="w-full max-h-48 object-contain"
                  />
                  <p className="text-xs text-tiki-brown/30 font-mono mt-2 text-center truncate">
                    {character.image.main}
                  </p>
                </div>
              ) : (
                <div className="border border-warm-coral/20 rounded-2xl bg-warm-coral/5 flex flex-col items-center justify-center h-20 gap-1 px-4">
                  <span className="text-lg select-none">🚫</span>
                  <p className="text-xs font-bold text-warm-coral/70 uppercase tracking-wide text-center">
                    Invalid image — not rendered
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Character References section ── */}
      <SectionToggle
        label={`Character References (${assets.length})`}
        open={refsOpen}
        onToggle={() => setRefsOpen((v) => !v)}
        badge={
          pendingCount > 0 ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 uppercase tracking-wide">
              {pendingCount} pending
            </span>
          ) : undefined
        }
      />
      {refsOpen && (
        <div className="px-4 py-4 flex flex-col gap-4 bg-tiki-brown/2">

          {/* Reference summary counts */}
          {assets.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${hasPrimaryRef_ ? "bg-tropical-green/8 border-tropical-green/20 text-tropical-green font-bold" : "bg-tiki-brown/6 border-tiki-brown/10 text-tiki-brown/45 font-semibold"}`}>
                Primary Ref: {hasPrimaryRef_ ? "Yes ✓" : "No"}
              </div>
              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${approvedSupportingCount > 0 ? "bg-tropical-green/8 border-tropical-green/20 text-tropical-green font-bold" : "bg-tiki-brown/6 border-tiki-brown/10 text-tiki-brown/45 font-semibold"}`}>
                Supporting: {approvedSupportingCount}
              </div>
              <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border ${approvedEnvironmentCount > 0 ? "bg-sky-blue/15 border-sky-blue/25 text-tiki-brown/65 font-bold" : "bg-tiki-brown/6 border-tiki-brown/10 text-tiki-brown/45 font-semibold"}`}>
                Environment: {approvedEnvironmentCount}
              </div>
              {pendingCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border bg-pineapple-yellow/15 border-pineapple-yellow/30 text-tiki-brown/65 font-semibold">
                  Needs Review: {pendingCount}
                </div>
              )}
              {rejectedArchivedCount > 0 && (
                <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border bg-tiki-brown/6 border-tiki-brown/10 text-tiki-brown/40 font-semibold">
                  Rejected / Archived: {rejectedArchivedCount}
                </div>
              )}
            </div>
          )}

          {/* Explanatory copy */}
          {assets.length > 0 && (
            <div className="flex items-start gap-2.5 bg-sky-blue/8 border border-sky-blue/15 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">💡</span>
              <p className="text-xs text-tiki-brown/60 leading-relaxed">
                <strong className="font-semibold">The Primary Official Reference</strong> is the one official profile sheet for this character.{" "}
                <strong className="font-semibold">Supporting References</strong> help AI preserve expressions, poses, style, and trademark fidelity.{" "}
                <strong className="font-semibold">Environment/Home References</strong> describe where the character lives and appears — used for story settings and scene planning.
              </p>
            </div>
          )}

          {assets.length === 0 ? (
            <p className="text-xs text-tiki-brown/40 italic text-center py-6">
              No reference assets uploaded for this character yet.
            </p>
          ) : (
            <>
              {profileSheetAssets.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
                    Official Profile Sheet
                  </p>
                  {profileSheetAssets.map((asset) => (
                    <AssetReviewCard
                      key={asset.id}
                      asset={asset}
                      isDraftCharacter={isDraft}
                      onReviewed={handleReviewed}
                    />
                  ))}
                </div>
              )}
              {mainRefAssets.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
                    Main Character Image
                  </p>
                  {mainRefAssets.map((asset) => (
                    <AssetReviewCard
                      key={asset.id}
                      asset={asset}
                      isDraftCharacter={isDraft}
                      onReviewed={handleReviewed}
                    />
                  ))}
                </div>
              )}
              {supportingAssets.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
                    Supporting References
                  </p>
                  <p className="text-xs text-tiki-brown/40 leading-relaxed -mt-1">
                    These references help future AI generation preserve expressions, poses, mood, proportions, style, and trademark fidelity.
                  </p>
                  {supportingAssets.map((asset) => (
                    <AssetReviewCard
                      key={asset.id}
                      asset={asset}
                      isDraftCharacter={isDraft}
                      onReviewed={handleReviewed}
                    />
                  ))}
                </div>
              )}
              {environmentAssets.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
                    Environment / Home References
                  </p>
                  <p className="text-xs text-tiki-brown/40 leading-relaxed -mt-1">
                    These references help the story builder describe where this character lives, plays, learns, and appears. They support future story settings, background prompts, animation locations, and environment consistency.
                  </p>
                  {environmentAssets.map((asset) => (
                    <AssetReviewCard
                      key={asset.id}
                      asset={asset}
                      isDraftCharacter={isDraft}
                      onReviewed={handleReviewed}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Profile Builder section ── */}
      <SectionToggle
        label="Profile Builder"
        open={builderOpen}
        onToggle={() => setBuilderOpen((v) => !v)}
        badge={
          !hasRef ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/40 uppercase tracking-wide">
              Needs Ref URL
            </span>
          ) : undefined
        }
      />
      {builderOpen && (
        <div className="px-4 py-4 bg-tiki-brown/2">
          <CharacterBuilderRow character={character} />
        </div>
      )}

      {/* ── Character Status section ── */}
      <SectionToggle
        label="Character Status"
        open={statusOpen}
        onToggle={() => setStatusOpen((v) => !v)}
      />
      {statusOpen && (
        <div className="px-4 py-4 bg-tiki-brown/2">
          <CharacterApprovalRow
            character={character}
            approvedRefCount={approvedRefCount}
            builtInRefValid={builtInRefValid}
            isOfficialCharacter={isOfficialCharacter}
          />
        </div>
      )}

      {/* ── Technical Details section ── */}
      <SectionToggle
        label="Technical Details"
        open={detailsOpen}
        onToggle={() => setDetailsOpen((v) => !v)}
      />
      {detailsOpen && (
        <div className="px-5 py-5 flex flex-col gap-5 bg-tiki-brown/2">

          {/* Integrity summary table */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
              Reference Asset Integrity
            </p>
            <div className="flex flex-col border border-tiki-brown/8 rounded-xl overflow-hidden">
              {(
                [
                  ["Valid Main Image", assetSummary.hasValidMainImage],
                  ["Valid Profile Sheet", assetSummary.hasValidProfileSheet],
                  ["Valid Character Sheet", assetSummary.hasValidCharacterSheet],
                  ["Any Valid Reference", assetSummary.hasAnyValidReference],
                  [
                    "Reference-Anchored Ready",
                    assetSummary.readyForReferenceAnchoredGeneration,
                  ],
                ] as [string, boolean][]
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-2 py-2 px-3 border-b border-tiki-brown/6 last:border-0 bg-white"
                >
                  <span className="text-xs text-tiki-brown/45 font-semibold">{label}</span>
                  <span
                    className={`text-xs font-bold ${value ? "text-tropical-green" : "text-warm-coral/70"}`}
                  >
                    {value ? "Yes" : "No"}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {assetSummary.assets.map((asset) => (
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
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${recommendedUseBadgeClass(asset.recommendedUse)}`}
                      >
                        {recommendedUseLabel(asset.recommendedUse)}
                      </span>
                    </div>
                  </div>
                  {asset.path && (
                    <p className="text-xs font-mono text-tiki-brown/45 break-all">{asset.path}</p>
                  )}
                  {asset.issue && (
                    <p className="text-xs text-warm-coral/80 font-semibold">{asset.issue}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Visual identity */}
          {(character.visualIdentity?.styleNotes ||
            (character.visualIdentity?.palette?.length ?? 0) > 0) && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
                Visual Identity
              </p>
              {character.visualIdentity?.styleNotes && (
                <p className="text-sm text-tiki-brown/70 leading-relaxed">
                  {character.visualIdentity.styleNotes}
                </p>
              )}
              {(character.visualIdentity?.palette?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-2">
                  {character.visualIdentity!.palette!.map((swatch) => (
                    <div key={swatch.hex} className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-4 rounded-full border border-tiki-brown/15 flex-shrink-0"
                        style={{ backgroundColor: swatch.hex }}
                      />
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
              <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">
                Personality
              </p>
              <div className="flex flex-wrap gap-1.5">
                {character.personality.map((trait) => (
                  <span
                    key={trait}
                    className="text-xs px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple font-semibold"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Character rules */}
          {((character.characterRules?.always?.length ?? 0) > 0 ||
            (character.characterRules?.never?.length ?? 0) > 0) && (
            <div className="grid sm:grid-cols-2 gap-3">
              {(character.characterRules?.always?.length ?? 0) > 0 && (
                <div className="bg-tropical-green/6 border border-tropical-green/15 rounded-xl p-4">
                  <p className="text-xs font-bold text-tropical-green/80 uppercase tracking-wide mb-2">
                    Always
                  </p>
                  <ul className="space-y-1">
                    {character.characterRules.always.map((rule) => (
                      <li
                        key={rule}
                        className="flex items-start gap-2 text-xs text-tiki-brown/65 leading-relaxed"
                      >
                        <span className="flex-shrink-0 text-tropical-green/60 mt-0.5">✓</span>
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(character.characterRules?.never?.length ?? 0) > 0 && (
                <div className="bg-warm-coral/6 border border-warm-coral/15 rounded-xl p-4">
                  <p className="text-xs font-bold text-warm-coral/80 uppercase tracking-wide mb-2">
                    Never
                  </p>
                  <ul className="space-y-1">
                    {character.characterRules.never.map((rule) => (
                      <li
                        key={rule}
                        className="flex items-start gap-2 text-xs text-tiki-brown/65 leading-relaxed"
                      >
                        <span className="flex-shrink-0 text-warm-coral/60 mt-0.5">✕</span>
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Fidelity notes */}
          {fidelityNotes.length > 0 && (
            <div className="bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl p-4">
              <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide mb-2">
                Visual Fidelity Reminder
              </p>
              <ul className="space-y-1">
                {fidelityNotes.map((note) => (
                  <li
                    key={note}
                    className="flex items-start gap-2 text-xs text-tiki-brown/70 leading-relaxed"
                  >
                    <span className="flex-shrink-0 text-pineapple-yellow/70 mt-0.5">•</span>
                    {note}
                  </li>
                ))}
              </ul>
              {isTiki && (
                <div className="mt-3 flex items-start gap-2 bg-warm-coral/10 border border-warm-coral/20 rounded-lg px-3 py-2">
                  <span className="text-sm flex-shrink-0">⚡</span>
                  <p className="text-xs text-tiki-brown/70 leading-relaxed">
                    <strong className="font-bold">Tiki Trouble guardrail:</strong> Must remain
                    mischievous, funny, dramatic, and kid-friendly.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
