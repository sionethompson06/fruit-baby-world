import { getCoverPageSettings } from "@/lib/coverPage";
import CoverPage from "@/components/cover/CoverPage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminCoverPreviewPage() {
  const settings = getCoverPageSettings();

  return (
    <div>
      {/* Admin-only preview banner — not shown on public cover page */}
      <div className="bg-ube-purple/10 border-b border-ube-purple/20 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-ube-purple uppercase tracking-wider">
            Admin Preview
          </span>
          <span className="text-xs text-tiki-brown/50">
            — rendered regardless of enabled state
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              settings.enabled
                ? "bg-warm-coral/15 text-warm-coral"
                : "bg-tropical-green/15 text-tropical-green"
            }`}
          >
            Cover is currently {settings.enabled ? "ON" : "OFF"}
          </span>
          <span className="text-xs text-tiki-brown/40">
            Preview only — does not change public visibility
          </span>
        </div>
      </div>

      <CoverPage settings={settings} />
    </div>
  );
}
