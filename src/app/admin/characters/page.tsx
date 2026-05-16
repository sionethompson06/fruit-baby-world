import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Link from "next/link";
import { type Character } from "@/lib/content";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import {
  checkCharacterAssets,
  buildReadinessSummary,
} from "@/lib/characterAssets";
import type { UploadedReferenceAsset } from "@/app/api/reference-assets/upload-character-reference/route";
import CharacterReferenceUploadForm, {
  type CharacterOption,
} from "./CharacterReferenceUploadForm";
import CreateCharacterDraftForm from "./CreateCharacterDraftForm";
import CharacterWorkspaceCard from "./CharacterWorkspaceCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Character Studio | Admin",
};

// ─── Global fidelity rules ────────────────────────────────────────────────────

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

// ─── Reference asset loader ───────────────────────────────────────────────────

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

// ─── Constants ────────────────────────────────────────────────────────────────

const OFFICIAL_CHARACTER_SLUGS = new Set([
  "pineapple-baby",
  "ube-baby",
  "mango-baby",
  "kiwi-baby",
  "coconut-baby",
  "tiki",
]);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCharactersPage() {
  const characters = loadAllCharactersFromDisk();
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
      (!c.approvalMode && c.status !== "active" && c.publicUseAllowed !== true),
  }));

  const approvedRefCounts: Record<string, number> = {};
  const builtInRefValid: Record<string, boolean> = {};
  for (let i = 0; i < characters.length; i++) {
    const c = characters[i];
    approvedRefCounts[c.slug] = uploadedAssets.filter(
      (a) =>
        a.characterSlug === c.slug &&
        a.reviewStatus === "approved-for-generation" &&
        a.approvedForGeneration === true &&
        a.generationUseAllowed === true
    ).length;
    builtInRefValid[c.slug] = assetSummaries[i].hasAnyValidReference;
  }

  const assetSummaryBySlug = Object.fromEntries(
    characters.map((c, i) => [c.slug, assetSummaries[i]])
  );

  function assetsBySlug(slug: string): UploadedReferenceAsset[] {
    return uploadedAssets.filter((a) => a.characterSlug === slug);
  }

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      <section className="bg-gradient-to-b from-pineapple-yellow/25 via-bg-cream to-bg-cream py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Admin Only
            </span>
          </div>
          <div className="text-4xl mb-3">🎬</div>
          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
            Character Studio
          </h1>
          <p className="text-tiki-brown/70 text-base leading-relaxed max-w-xl">
            Manage character references, profile drafts, and approval status. Each character has its
            own workspace below.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 pb-16 flex flex-col gap-6">

        <div className="flex items-start gap-3 bg-white border border-pineapple-yellow/40 rounded-2xl px-5 py-4 shadow-sm">
          <span className="text-xl flex-shrink-0">📋</span>
          <p className="text-sm text-tiki-brown/65 leading-relaxed">
            <strong className="text-tiki-brown font-bold">Admin only.</strong>{" "}
            Upload reference assets and manage character status below. Image generation is not
            active yet. Character editing is handled via JSON files.
          </p>
        </div>

        {/* ── Create new character draft ── */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h2 className="text-base font-black text-tiki-brown">Create New Character Draft</h2>
            <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">
              Admin Only
            </span>
          </div>
          <p className="text-sm text-tiki-brown/60 leading-relaxed">
            Create a new character profile draft. New characters are{" "}
            <strong className="font-semibold">private by default</strong> and are not approved for
            stories or generation until reference assets are uploaded and reviewed. A Vercel redeploy
            is required for the character to appear in admin lists.
          </p>
          <CreateCharacterDraftForm />
        </div>

        {/* ── Upload reference file ── */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">⬆️</span>
            <h2 className="text-base font-black text-tiki-brown">
              Upload Character Reference File
            </h2>
            <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">
              Admin Only
            </span>
          </div>
          <p className="text-sm text-tiki-brown/60 leading-relaxed">
            Upload PNG, JPEG, or WebP reference guide images to Vercel Blob. Uploaded assets default
            to <strong className="font-semibold">approvedForGeneration: false</strong> and require
            review before use.
          </p>
          <CharacterReferenceUploadForm characters={characterOptions} />
        </div>

        {/* ── Official character workspace cards ── */}
        {officialCharacters.length > 0 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="text-base">🌟</span>
              <h2 className="text-sm font-black text-tiki-brown/70 uppercase tracking-wide">
                Official Characters ({officialCharacters.length})
              </h2>
            </div>
            {officialCharacters.map((c) => (
              <CharacterWorkspaceCard
                key={c.id}
                character={c}
                uploadedAssets={assetsBySlug(c.slug)}
                approvedRefCount={approvedRefCounts[c.slug] ?? 0}
                builtInRefValid={builtInRefValid[c.slug] ?? false}
                isOfficialCharacter={OFFICIAL_CHARACTER_SLUGS.has(c.slug)}
                assetSummary={assetSummaryBySlug[c.slug]}
              />
            ))}
          </div>
        )}

        {/* ── Draft character workspace cards ── */}
        {draftCharacters.length > 0 && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="text-base">📝</span>
              <h2 className="text-sm font-black text-tiki-brown/70 uppercase tracking-wide">
                Draft Characters ({draftCharacters.length})
              </h2>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral/80 uppercase tracking-wide">
                Private
              </span>
            </div>
            <div className="flex items-start gap-3 bg-tiki-brown/4 border border-tiki-brown/10 rounded-xl px-4 py-3">
              <span className="text-sm flex-shrink-0">🔒</span>
              <p className="text-xs text-tiki-brown/55 leading-relaxed">
                Draft characters are private and not approved for stories or generation.
              </p>
            </div>
            {draftCharacters.map((c) => (
              <CharacterWorkspaceCard
                key={c.id}
                character={c}
                uploadedAssets={assetsBySlug(c.slug)}
                approvedRefCount={approvedRefCounts[c.slug] ?? 0}
                builtInRefValid={builtInRefValid[c.slug] ?? false}
                isOfficialCharacter={false}
                assetSummary={assetSummaryBySlug[c.slug]}
              />
            ))}
          </div>
        )}

        {/* ── Reference asset integrity summary ── */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔍</span>
            <h2 className="text-base font-black text-tiki-brown">
              Reference Asset Integrity Summary
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(
              [
                ["Total Characters", String(readiness.totalCharacters), undefined],
                [
                  "Reference-Ready",
                  String(readiness.readyCount),
                  readiness.readyCount === readiness.totalCharacters,
                ],
                [
                  "Missing Valid References",
                  String(readiness.notReadyCount),
                  readiness.notReadyCount === 0 ? true : false,
                ],
                [
                  "Invalid Asset References",
                  String(readiness.invalidAssetCount),
                  readiness.invalidAssetCount === 0 ? true : false,
                ],
                [
                  "Profile Sheets Available",
                  String(readiness.profileSheetsAvailable),
                  readiness.profileSheetsAvailable === readiness.totalCharacters,
                ],
              ] as [string, string, boolean | undefined][]
            ).map(([label, value, positive]) => (
              <div
                key={label}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-4 py-3 text-center border ${
                  positive === true
                    ? "bg-tropical-green/8 border-tropical-green/20"
                    : positive === false
                    ? "bg-warm-coral/8 border-warm-coral/20"
                    : "bg-tiki-brown/4 border-tiki-brown/8"
                }`}
              >
                <span
                  className={`text-xl font-black ${
                    positive === true
                      ? "text-tropical-green"
                      : positive === false
                      ? "text-warm-coral/80"
                      : "text-tiki-brown"
                  }`}
                >
                  {value}
                </span>
                <span className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide leading-tight">
                  {label}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-3 bg-sky-blue/8 border border-sky-blue/20 rounded-xl px-4 py-4">
            <span className="text-base flex-shrink-0">💡</span>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-bold text-tiki-brown/65 uppercase tracking-wide">
                About Reference-Anchored Generation
              </p>
              <p className="text-sm text-tiki-brown/70 leading-relaxed">
                Future reference-anchored image generation should use valid official profile sheets,
                isolated main images, and character sheets as visual source references.
              </p>
            </div>
          </div>
          {readiness.invalidAssetCount > 0 && (
            <div className="flex items-start gap-3 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-4 py-3">
              <span className="text-base flex-shrink-0">⚠️</span>
              <p className="text-sm text-tiki-brown/70 leading-relaxed">
                <strong className="font-bold">
                  {readiness.invalidAssetCount} invalid asset reference
                  {readiness.invalidAssetCount !== 1 ? "s" : ""} found.
                </strong>{" "}
                Invalid files exist on disk but fail image validation.
              </p>
            </div>
          )}
        </div>

        {/* ── Stat counters ── */}
        <div className="flex flex-wrap gap-3">
          {(
            [
              ["Characters", String(characters.length)],
              [
                "Fruit Babies",
                String(characters.filter((c) => c.type === "fruit-baby").length),
              ],
              [
                "Rival Characters",
                String(characters.filter((c) => c.type === "villain").length),
              ],
              ["Profile Sheets", String(readiness.profileSheetsAvailable)],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col items-center gap-0.5 bg-white border border-tiki-brown/10 rounded-2xl px-5 py-3 min-w-[7rem] text-center shadow-sm"
            >
              <span className="text-xl font-black text-tiki-brown">{value}</span>
              <span className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide leading-tight">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* ── Global fidelity rules ── */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔒</span>
            <h2 className="text-base font-black text-tiki-brown">
              Global Character Fidelity Rules
            </h2>
          </div>
          <ul className="space-y-2">
            {GLOBAL_FIDELITY_RULES.map((rule) => (
              <li
                key={rule}
                className="flex items-start gap-2.5 text-sm text-tiki-brown/70 leading-relaxed"
              >
                <span className="flex-shrink-0 text-ube-purple/60 mt-0.5">•</span>
                {rule}
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 bg-warm-coral/8 border border-warm-coral/20 rounded-xl px-4 py-3">
            <span className="text-base flex-shrink-0">⚡</span>
            <p className="text-sm text-tiki-brown/70 leading-relaxed">
              <strong className="font-bold">Tiki Trouble:</strong> Must remain mischievous, funny,
              dramatic, and kid-friendly in all generated media.
            </p>
          </div>
        </div>

        {/* ── Future use ── */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
          <h2 className="text-base font-black text-tiki-brown">Future Use</h2>
          <ul className="space-y-2">
            {[
              "These references will later support story panel generation using official profile images.",
              "These references will later support animation clip generation with character-anchored prompts.",
              "These references will later support admin-only character variation generation.",
              "No generation tools are active on this page yet.",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-tiki-brown/70 leading-relaxed"
              >
                <span className="flex-shrink-0 text-tropical-green/60 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 bg-tiki-brown/4 rounded-xl px-4 py-3">
            <span className="text-base flex-shrink-0">🎨</span>
            <p className="text-sm text-tiki-brown/65 leading-relaxed">
              Future character variation tools will live in{" "}
              <Link
                href="/admin/variations"
                className="font-bold text-ube-purple hover:text-ube-purple/70 transition-colors"
              >
                /admin/variations
              </Link>
              . Variation generation is not active yet.
            </p>
          </div>
        </div>

      </section>
    </div>
  );
}
