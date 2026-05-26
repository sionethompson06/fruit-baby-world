"use client";

import { useState } from "react";
import type { UploadedReferenceAsset } from "@/app/api/reference-assets/upload-character-reference/route";
import { AssetReviewCard } from "./ReferenceAssetReviewPanel";

export default function CharacterGlobalReviewSection({
  initialPendingAssets,
  characterNames,
}: {
  initialPendingAssets: UploadedReferenceAsset[];
  characterNames: Record<string, string>;
}) {
  const [assets, setAssets] = useState(initialPendingAssets);

  function handleReviewed(updated: UploadedReferenceAsset) {
    setAssets((prev) =>
      prev
        .map((a) => (a.id === updated.id ? updated : a))
        .filter((a) => a.reviewStatus === "needs-review")
    );
  }

  if (assets.length === 0) {
    return (
      <div className="flex items-center gap-3 bg-tropical-green/8 border border-tropical-green/20 rounded-2xl px-5 py-4">
        <span className="text-lg">✓</span>
        <p className="text-sm font-semibold text-tropical-green/80">
          No references pending review.
        </p>
      </div>
    );
  }

  const byCharacter: Record<string, UploadedReferenceAsset[]> = {};
  for (const a of assets) {
    if (!byCharacter[a.characterSlug]) byCharacter[a.characterSlug] = [];
    byCharacter[a.characterSlug].push(a);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-4 py-3">
        <span className="text-sm flex-shrink-0">💡</span>
        <p className="text-xs text-tiki-brown/65 leading-relaxed">
          Review each asset and set its approval status. Approved assets become available for
          reference-anchored generation. Reviewed assets are removed from this queue.
        </p>
      </div>
      {Object.entries(byCharacter).map(([slug, charAssets]) => (
        <div key={slug} className="flex flex-col gap-2">
          <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide px-1">
            {characterNames[slug] ?? slug}{" "}
            <span className="font-normal text-tiki-brown/35">({charAssets.length})</span>
          </p>
          {charAssets.map((asset) => (
            <AssetReviewCard
              key={asset.id}
              asset={asset}
              isDraftCharacter={false}
              onReviewed={handleReviewed}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
