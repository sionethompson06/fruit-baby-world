import type { SavedEpisodeDraft } from "@/lib/savedEpisodes";
import { str } from "./helpers";

function MetaRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 items-baseline">
      <dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-tiki-brown/80">{value}</dd>
    </div>
  );
}

export default function PublicStatusCard({
  normalised,
  reviewObj,
  publishingObj,
}: {
  normalised: SavedEpisodeDraft;
  reviewObj: Record<string, unknown> | null;
  publishingObj: Record<string, unknown> | null;
}) {
  const isPublicReady =
    normalised.readyForPublicSite ||
    normalised.publicStatus === "published" ||
    (publishingObj !== null && publishingObj.publicStatus === "published");

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
      <h2 className="text-base font-black text-tiki-brown">Current Public Status</h2>

      <dl className="flex flex-col gap-2">
        <MetaRow
          label="Public Status"
          value={str(publishingObj?.publicStatus) || normalised.publicStatus}
        />
        <MetaRow
          label="Ready for Public Site"
          value={String(normalised.readyForPublicSite)}
        />
        <MetaRow
          label="Approved for Save"
          value={String(normalised.approvedForSave)}
        />
        {reviewObj && str(reviewObj.status) && (
          <MetaRow label="Review Status" value={str(reviewObj.status)} />
        )}
      </dl>

      {isPublicReady ? (
        <div className="flex items-center gap-2.5 bg-tropical-green/15 border border-tropical-green/30 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0">🟢</span>
          <p className="text-sm font-semibold text-tropical-green">
            This episode is marked public-ready in JSON.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 bg-tiki-brown/6 border border-tiki-brown/15 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0">🔒</span>
          <p className="text-sm font-semibold text-tiki-brown/60">
            This episode is not public-ready yet.
          </p>
        </div>
      )}

      <p className="text-xs text-tiki-brown/50 leading-relaxed">
        Drafts remain private to the admin library until a future publishing
        phase marks them public-ready.
      </p>
    </div>
  );
}
