import { str, strArr, isRec } from "./helpers";
import EditPanelCopySection from "./EditPanelCopySection";
import ReorderPanelsSection, { type PanelSummary } from "./ReorderPanelsSection";
import PanelVisibilityControl from "./PanelVisibilityControl";
import { getMediaLifecycleBadgeClass } from "@/lib/mediaLifecycle";

function bool(v: unknown): boolean {
  return v === true;
}

function fmtDate(v: unknown): string {
  if (typeof v !== "string" || !v.trim()) return "—";
  try {
    return new Date(v).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return v;
  }
}

function PublicDisplayBadge({ panel }: { panel: Record<string, unknown> }) {
  const publicUse = isRec(panel.publicUse) ? panel.publicUse : null;
  const review = isRec(panel.review) ? panel.review : null;
  const isApproved =
    panel.status === "approved" || panel.approvalStatus === "approved";
  const fidelityApproved = bool(review?.characterFidelityApproved);
  const publicAllowed = bool(publicUse?.allowed);
  const appearsOnPage = bool(publicUse?.appearsOnPublicStoryPage);

  if (isApproved && fidelityApproved && publicAllowed && appearsOnPage) {
    return (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getMediaLifecycleBadgeClass("public-ready")}`}>
        Public Ready
      </span>
    );
  }
  if (isApproved && fidelityApproved) {
    return (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getMediaLifecycleBadgeClass("attached-to-episode")}`}>
        Attached to Episode
      </span>
    );
  }
  if (!isApproved || !fidelityApproved) {
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pineapple-yellow/40 text-tiki-brown/70">
        Needs Review
      </span>
    );
  }
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getMediaLifecycleBadgeClass("attached-to-episode")}`}>
      Attached to Episode
    </span>
  );
}

function SavedPanelCard({
  panel,
  scene,
  episodeSlug,
}: {
  panel: Record<string, unknown>;
  scene?: Record<string, unknown>;
  episodeSlug: string;
}) {
  const sceneNum = typeof panel.sceneNumber === "number" ? panel.sceneNumber : 0;
  const panelTitle = str(panel.panelTitle) || `Scene ${sceneNum}`;
  const refChars = strArr(panel.referenceCharacters);
  const asset = isRec(panel.asset) ? panel.asset : null;
  const review = isRec(panel.review) ? panel.review : null;
  const publicUse = isRec(panel.publicUse) ? panel.publicUse : null;

  const imageUrl = asset ? str(asset.url) : "";
  const altText = asset ? str(asset.alt) : "";
  const captionText = asset
    ? str(asset.caption) || str(panel.publicCaption)
    : str(panel.publicCaption);
  const mimeType = asset ? str(asset.mimeType) : "";
  const storageProvider = asset ? str(asset.storageProvider) : "";
  const isApproved =
    panel.status === "approved" || panel.approvalStatus === "approved";

  const sceneTitle = scene ? str(scene.title) : "";
  const sceneSummary = scene ? str(scene.summary) : "";

  return (
    <div className="rounded-2xl border border-tiki-brown/10 overflow-hidden bg-white shadow-sm">
      {/* Image preview */}
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={altText || `Story panel Scene ${sceneNum}`}
          className="w-full block object-contain bg-tiki-brown/3 max-h-80"
        />
      ) : (
        <div className="flex items-center justify-center h-32 bg-tiki-brown/4 border-b border-tiki-brown/8">
          <p className="text-xs text-tiki-brown/35 font-semibold">No image URL stored</p>
        </div>
      )}

      {/* Card info */}
      <div className="p-5 flex flex-col gap-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple">
              Scene {sceneNum}
            </span>
            <span className="text-sm font-black text-tiki-brown">{panelTitle}</span>
          </div>
          <PublicDisplayBadge panel={panel} />
        </div>

        {/* Matching scene info */}
        {(sceneTitle || sceneSummary) && (
          <div className="bg-sky-blue/6 border border-sky-blue/20 rounded-xl px-4 py-3 flex flex-col gap-1">
            {sceneTitle && (
              <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
                {sceneTitle}
              </p>
            )}
            {sceneSummary && (
              <p className="text-xs text-tiki-brown/65 leading-relaxed">{sceneSummary}</p>
            )}
          </div>
        )}

        {/* Asset details grid */}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            ["Storage Provider", storageProvider || "—"],
            ["MIME Type", mimeType || "—"],
            ["Approval Status", isApproved ? "Approved ✓" : "Not Approved"],
            ["Fidelity Approved", bool(review?.characterFidelityApproved) ? "Yes ✓" : "No"],
            ["Public Use Allowed", bool(publicUse?.allowed) ? "Yes ✓" : "No"],
            ["Appears on Story Page", bool(publicUse?.appearsOnPublicStoryPage) ? "Yes ✓" : "No"],
            ["Created", fmtDate(panel.createdAt)],
            ["Approved", fmtDate(panel.approvedAt)],
          ].map(([label, value]) => (
            <div key={label} className="flex items-start gap-2">
              <span className="text-xs text-tiki-brown/40 font-semibold whitespace-nowrap min-w-[7rem]">
                {label}:
              </span>
              <span
                className={`text-xs font-bold ${
                  String(value).includes("✓")
                    ? "text-tropical-green"
                    : String(value) === "No" || String(value) === "Not Approved"
                    ? "text-warm-coral/70"
                    : "text-tiki-brown/70"
                }`}
              >
                {value}
              </span>
            </div>
          ))}
        </div>

        {/* Alt text */}
        {altText && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-tiki-brown/40 font-semibold uppercase tracking-wide">
              Alt Text
            </span>
            <p className="text-xs text-tiki-brown/65 leading-relaxed bg-tiki-brown/3 rounded-lg px-3 py-2">
              {altText}
            </p>
          </div>
        )}

        {/* Reference characters */}
        {refChars.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-tiki-brown/40 font-semibold uppercase tracking-wide">
              Reference Characters
            </span>
            <div className="flex flex-wrap gap-1.5">
              {refChars.map((c) => (
                <span
                  key={c}
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Review notes */}
        {review && str(review.notes) && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-tiki-brown/40 font-semibold uppercase tracking-wide">
              Review Notes
            </span>
            <p className="text-xs text-tiki-brown/65 leading-relaxed bg-pineapple-yellow/10 border border-pineapple-yellow/25 rounded-lg px-3 py-2">
              {str(review.notes)}
            </p>
          </div>
        )}

        {/* Asset URL */}
        {imageUrl && (
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start text-xs font-bold text-ube-purple hover:text-ube-purple/70 transition-colors underline underline-offset-2"
          >
            Open asset ↗
          </a>
        )}

        {/* ── Replace This Panel ── */}
        <div className="flex flex-col gap-3 pt-4 border-t border-tiki-brown/8">
          <p className="text-xs font-black text-tiki-brown/55 uppercase tracking-wide">
            Replace This Panel
          </p>
          <p className="text-xs text-tiki-brown/65 leading-relaxed">
            To replace this panel, generate a new temporary draft for Scene {sceneNum} in
            the Story Panel Prompt Builder below, review it, upload it to media storage,
            then attach the uploaded asset to episode JSON. The existing saved panel
            reference will be replaced for this scene number.
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-2 bg-sky-blue/8 border border-sky-blue/20 rounded-xl px-3 py-2">
              <span className="text-xs flex-shrink-0">🔄</span>
              <p className="text-xs text-tiki-brown/60 leading-relaxed">
                Replacement uses the same scene number: <strong className="font-bold">Scene {sceneNum}</strong>.
                Attaching a new asset for Scene {sceneNum} will update this saved panel reference.
              </p>
            </div>
            <div className="flex items-start gap-2 bg-pineapple-yellow/12 border border-pineapple-yellow/30 rounded-xl px-3 py-2">
              <span className="text-xs flex-shrink-0">⚠️</span>
              <p className="text-xs text-tiki-brown/60 leading-relaxed">
                The previous Blob asset is not deleted automatically in this phase.
              </p>
            </div>
          </div>
          <a
            href={`#panel-prompt-scene-${sceneNum}`}
            className="self-start text-xs font-bold text-ube-purple hover:text-ube-purple/70 transition-colors underline underline-offset-2"
          >
            Generate Replacement Draft for Scene {sceneNum} ↓
          </a>
        </div>

        {/* ── Panel Visibility ── */}
        <PanelVisibilityControl
          episodeSlug={episodeSlug}
          sceneNumber={sceneNum}
          initialVisibility={str(panel.visibility) === "hidden" ? "hidden" : "public"}
        />

        {/* ── Edit Alt Text & Caption ── */}
        <EditPanelCopySection
          episodeSlug={episodeSlug}
          sceneNumber={sceneNum}
          initialAlt={altText}
          initialCaption={captionText}
        />
      </div>
    </div>
  );
}

export default function SavedStoryPanelAssetLibrary({
  raw,
  scenes,
  episodeSlug,
}: {
  raw: Record<string, unknown>;
  scenes: Record<string, unknown>[];
  episodeSlug: string;
}) {
  const media = isRec(raw.media) ? raw.media : null;
  const spm = isRec(media?.storyPanelMode) ? media!.storyPanelMode : null;
  const panels = Array.isArray(spm?.panels)
    ? (spm!.panels as unknown[]).filter(isRec)
    : [];
  const spmStatus = spm ? str(spm.status) : "";

  // Build scene lookup by sceneNumber
  const sceneByNumber = Object.fromEntries(
    scenes.map((s) => [typeof s.sceneNumber === "number" ? s.sceneNumber : -1, s])
  );

  // Summary counts
  const total = panels.length;
  const approved = panels.filter(
    (p) => p.status === "approved" || p.approvalStatus === "approved"
  ).length;
  const publicAllowed = panels.filter((p) => {
    const pu = isRec(p.publicUse) ? p.publicUse : null;
    return bool(pu?.allowed);
  }).length;
  const appearsOnPage = panels.filter((p) => {
    const pu = isRec(p.publicUse) ? p.publicUse : null;
    return bool(pu?.appearsOnPublicStoryPage);
  }).length;
  const hiddenCount = panels.filter((p) => str(p.visibility) === "hidden").length;
  const vercelBlobCount = panels.filter((p) => {
    const asset = isRec(p.asset) ? p.asset : null;
    return asset?.storageProvider === "vercel-blob";
  }).length;

  const sorted = [...panels].sort((a, b) => {
    const aOrder =
      (typeof a.displayOrder === "number" ? a.displayOrder : null) ??
      (typeof a.sceneNumber === "number" ? a.sceneNumber : 999);
    const bOrder =
      (typeof b.displayOrder === "number" ? b.displayOrder : null) ??
      (typeof b.sceneNumber === "number" ? b.sceneNumber : 999);
    return aOrder - bOrder;
  });

  const panelSummaries: PanelSummary[] = sorted.map((p) => {
    const asset = isRec(p.asset) ? p.asset : null;
    const pu = isRec(p.publicUse) ? p.publicUse : null;
    return {
      sceneNumber: typeof p.sceneNumber === "number" ? p.sceneNumber : 0,
      panelTitle: str(p.panelTitle) || `Scene ${p.sceneNumber ?? "?"}`,
      imageUrl: typeof asset?.url === "string" ? asset.url : "",
      isPublic: bool(pu?.appearsOnPublicStoryPage),
      displayOrder: typeof p.displayOrder === "number" ? p.displayOrder : undefined,
    };
  });

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-lg">🖼️</span>
          <h2 className="text-base font-black text-tiki-brown">Saved Story Panel Assets</h2>
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/50 uppercase tracking-wide">
            Read-Only
          </span>
        </div>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          Approved story panel media assets attached to this episode JSON.
          Use the reorder controls below to adjust display order. Editing alt text and deleting
          panels will be added in future phases.
        </p>
      </div>

      {total === 0 ? (
        /* ── Empty state ── */
        <div className="flex flex-col items-center gap-3 py-8 text-center bg-tiki-brown/3 rounded-2xl border border-dashed border-tiki-brown/15">
          <span className="text-4xl">🖼️</span>
          <p className="text-sm font-bold text-tiki-brown/55">No saved story panel assets</p>
          <p className="text-xs text-tiki-brown/40 leading-relaxed max-w-sm">
            No saved story panel assets are attached to this episode yet. Generate, review,
            upload, and attach approved panels from the Story Panel Prompt Builder.
          </p>
        </div>
      ) : (
        <>
          {/* ── Summary card ── */}
          <div className="bg-sky-blue/6 border border-sky-blue/20 rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
              Asset Library Summary
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[
                ["Total Panels", String(total)],
                ["Attached to Episode", String(approved)],
                ["Public Ready", String(appearsOnPage)],
                ...(hiddenCount > 0 ? [["Hidden", String(hiddenCount)]] : []),
                ["In Media Storage", String(vercelBlobCount)],
                ["Panel Mode Status", spmStatus || "—"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex flex-col gap-0.5 bg-white rounded-xl px-3 py-2.5 border border-tiki-brown/8"
                >
                  <span className="text-xs text-tiki-brown/40 font-semibold leading-tight">
                    {label}
                  </span>
                  <span
                    className={`text-sm font-black ${
                      label === "Total Panels" || label === "Vercel Blob"
                        ? "text-tiki-brown"
                        : label === "Hidden from Public"
                        ? "text-warm-coral"
                        : value === String(total) && total > 0
                        ? "text-tropical-green"
                        : value === "0"
                        ? "text-warm-coral/70"
                        : "text-tiki-brown/70"
                    }`}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Panel cards ── */}
          <div className="flex flex-col gap-6">
            {sorted.map((panel, i) => {
              const sceneNum =
                typeof panel.sceneNumber === "number" ? panel.sceneNumber : -1;
              return (
                <SavedPanelCard
                  key={i}
                  panel={panel}
                  scene={sceneByNumber[sceneNum]}
                  episodeSlug={episodeSlug}
                />
              );
            })}
          </div>

          {/* ── Reorder section ── */}
          {total >= 2 && (
            <ReorderPanelsSection
              episodeSlug={episodeSlug}
              initialPanels={panelSummaries}
            />
          )}

          {/* ── Future actions note ── */}
          <div className="flex items-start gap-3 bg-pineapple-yellow/12 border border-pineapple-yellow/35 rounded-xl px-4 py-3">
            <span className="text-base flex-shrink-0">🔮</span>
            <p className="text-sm text-tiki-brown/65 leading-relaxed">
              Future phases will add removing and editing alt text for saved story panel assets.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
