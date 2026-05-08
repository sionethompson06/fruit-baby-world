import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import { getAllCharacters } from "@/lib/content";
import {
  checkCharacterAssets,
  buildClientReadinessMap,
} from "@/lib/characterAssets";
import type { UploadedReferenceAsset } from "@/app/api/reference-assets/upload-character-reference/route";
import VariationBuilderClient from "./VariationBuilderClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Variation Prompt Builder | Story Studio",
};

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

export default function VariationsPage() {
  const characters = getAllCharacters();
  const assetReadiness = buildClientReadinessMap(
    characters.map(checkCharacterAssets)
  );
  const uploadedReferenceAssets = loadUploadedReferenceAssets();

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* Header */}
      <section className="bg-gradient-to-b from-ube-purple/10 via-bg-cream to-bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Admin Only
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-tiki-brown/10 text-tiki-brown/60 uppercase tracking-widest">
              Prompt Planning
            </span>
          </div>
          <div className="text-4xl mb-3">🎨</div>
          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
            Reference-Anchored Character Variation Builder
          </h1>
          <p className="text-tiki-brown/70 text-base leading-relaxed max-w-xl">
            Prepare strict, character-safe prompts for future admin-only visual variations.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-16 flex flex-col gap-6">

        {/* Prompt planning notice */}
        <div className="flex items-start gap-3 bg-white border border-pineapple-yellow/40 rounded-2xl px-5 py-4 shadow-sm">
          <span className="text-xl flex-shrink-0">📋</span>
          <p className="text-sm text-tiki-brown/65 leading-relaxed">
            <strong className="text-tiki-brown font-bold">Prompt planning only. </strong>
            This is a prompt planning tool only. No images are generated, saved, uploaded, or
            published in this phase.
          </p>
        </div>

        {/* Admin-only warning */}
        <div className="flex items-start gap-3 bg-warm-coral/10 border border-warm-coral/30 rounded-2xl px-5 py-4">
          <span className="text-xl flex-shrink-0">🔒</span>
          <p className="text-sm text-tiki-brown/70 leading-relaxed">
            <strong className="font-bold text-tiki-brown">Admin-only. </strong>
            Public users should not freely generate or remix official Fruit Baby characters.
            Character variation tools must remain admin-controlled and approval-based.
          </p>
        </div>

        {/* Interactive client component */}
        <VariationBuilderClient
          characters={characters}
          assetReadiness={assetReadiness}
          uploadedReferenceAssets={uploadedReferenceAssets}
        />

      </section>
    </div>
  );
}
