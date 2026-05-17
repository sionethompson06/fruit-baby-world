import type {
  EpisodeReferencePackageSummary,
  CharacterReferencePackage,
} from "@/lib/referenceAssetLoader";

function CharacterPackageRow({
  pkg,
}: {
  pkg: CharacterReferencePackage;
}) {
  const typeCounts: { label: string; count: number }[] = [
    { label: "Profile", count: pkg.profileSheets.length },
    { label: "Main Ref", count: pkg.mainReferences.length },
    { label: "Supporting", count: pkg.supportingReferences.length },
    { label: "Environ.", count: pkg.environmentReferences.length },
    { label: "Product", count: pkg.productReferences.length },
    { label: "Brand", count: pkg.brandReferences.length },
  ].filter((x) => x.count > 0);

  return (
    <div className="flex flex-wrap items-center gap-2 py-2 border-b border-tiki-brown/6 last:border-0">
      <span className="text-xs font-bold text-tiki-brown/70 min-w-[7rem]">
        {pkg.characterName}
      </span>

      {pkg.isGenerationReady ? (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green">
          Ready
        </span>
      ) : (
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral/80">
          No refs
        </span>
      )}

      {pkg.primaryReferenceUrl && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-sky-blue/15 text-tiki-brown/60 font-semibold">
          Primary assigned
        </span>
      )}

      <span className="text-xs text-tiki-brown/45 font-semibold">
        {pkg.totalApprovedCount} approved
      </span>

      {typeCounts.length > 0 && (
        <div className="flex flex-wrap gap-1 ml-auto">
          {typeCounts.map(({ label, count }) => (
            <span
              key={label}
              className="text-xs px-1.5 py-0.5 rounded bg-tiki-brown/6 text-tiki-brown/50 font-semibold"
            >
              {count} {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReferencePackagePreviewSection({
  summary,
}: {
  summary: EpisodeReferencePackageSummary;
}) {
  const readyCount = summary.charactersSummary.filter((c) => c.isReady).length;
  const totalChars = summary.charactersSummary.length;

  // Build deduplicated character packages from scene packages
  const charPackageMap = new Map<string, CharacterReferencePackage>();
  for (const sp of summary.scenePackages) {
    for (const cp of sp.characterPackages) {
      if (!charPackageMap.has(cp.characterSlug)) {
        charPackageMap.set(cp.characterSlug, cp);
      }
    }
  }
  const charPackages = Array.from(charPackageMap.values());

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📦</span>
          <h2 className="text-base font-black text-tiki-brown">Reference Asset Packages</h2>
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple uppercase tracking-wide">
            Admin Only
          </span>
        </div>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          Approved reference assets available for each character in this episode.
          Read-only. No assets are generated, uploaded, or modified here.
        </p>
      </div>

      {/* Episode summary stats */}
      <div className="flex flex-wrap gap-3">
        {(
          [
            ["Episode Characters", String(totalChars)],
            ["Generation Ready", String(readyCount)],
            ["Total Approved Assets", String(summary.totalApprovedAssets)],
            ["Scenes", String(summary.scenePackages.length)],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col items-center gap-0.5 bg-ube-purple/6 border border-ube-purple/15 rounded-2xl px-4 py-2.5 min-w-[8rem] text-center"
          >
            <span className="text-sm font-black text-tiki-brown">{value}</span>
            <span className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide leading-tight">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Per-character packages */}
      {charPackages.length === 0 ? (
        <p className="text-sm text-tiki-brown/40 italic">
          No characters found in this episode&apos;s scenes.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
            Character Reference Packages
          </p>
          <div className="flex flex-col">
            {charPackages.map((pkg) => (
              <CharacterPackageRow key={pkg.characterSlug} pkg={pkg} />
            ))}
          </div>
        </div>
      )}

      {/* Per-scene breakdown */}
      {summary.scenePackages.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
            Scene Reference Breakdown
          </p>
          <div className="flex flex-col gap-2">
            {summary.scenePackages.map((sp) => {
              const allReady = sp.characterPackages.every((cp) => cp.isGenerationReady);
              const someReady = sp.characterPackages.some((cp) => cp.isGenerationReady);
              return (
                <div
                  key={sp.sceneNumber}
                  className="flex flex-wrap items-center gap-2 bg-tiki-brown/3 rounded-xl px-3 py-2"
                >
                  <span className="text-xs font-bold text-tiki-brown/60">
                    Scene {sp.sceneNumber}
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {sp.characterSlugs.map((slug) => {
                      const cp = sp.characterPackages.find(
                        (p) => p.characterSlug === slug
                      );
                      const ready = cp?.isGenerationReady ?? false;
                      return (
                        <span
                          key={slug}
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            ready
                              ? "bg-tropical-green/12 text-tropical-green"
                              : "bg-warm-coral/12 text-warm-coral/80"
                          }`}
                        >
                          {cp?.characterName ?? slug}
                          {ready ? " ✓" : " —"}
                        </span>
                      );
                    })}
                  </div>
                  <span className="ml-auto text-xs font-semibold text-tiki-brown/40">
                    {allReady
                      ? "All ready"
                      : someReady
                      ? "Partial"
                      : "None ready"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Read-only notice */}
      <div className="flex items-start gap-2.5 bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-3 py-2.5">
        <span className="text-sm flex-shrink-0">🔒</span>
        <p className="text-xs text-tiki-brown/60 leading-relaxed">
          Reference asset packages are read-only. No assets are generated, modified, or uploaded
          from this view. Official reference images must be reviewed and approved before any
          generation begins.
        </p>
      </div>
    </div>
  );
}
