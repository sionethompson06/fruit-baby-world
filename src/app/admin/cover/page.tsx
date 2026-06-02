import { getCoverPageSettings } from "@/lib/coverPage";
import AdminCoverForm from "./AdminCoverForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminCoverPage() {
  const settings = getCoverPageSettings();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-black text-tiki-brown">Cover Page</h1>
        <p className="text-sm text-tiki-brown/55 mt-1 max-w-xl">
          Control whether public visitors see the unveiling cover page or the
          full Pineapple Baby website.
        </p>
      </div>

      {/* Primary status banner — prominent and visually clear */}
      <div
        className={`rounded-2xl p-5 border-2 ${
          settings.enabled
            ? "bg-warm-coral/8 border-warm-coral/30"
            : "bg-tropical-green/8 border-tropical-green/25"
        }`}
      >
        <div className="flex items-start gap-4">
          {/* Status badge */}
          <div
            className={`flex-shrink-0 text-xs font-black px-3 py-1.5 rounded-full tracking-wider ${
              settings.enabled
                ? "bg-warm-coral text-white"
                : "bg-tropical-green text-white"
            }`}
          >
            {settings.enabled ? "ON" : "OFF"}
          </div>

          {/* Status description */}
          <div className="flex-1 min-w-0">
            <p className={`font-black text-base ${settings.enabled ? "text-warm-coral" : "text-tropical-green"}`}>
              {settings.enabled
                ? "Cover Page is ON — public visitors see the unveiling page only."
                : "Cover Page is OFF — the full website is publicly visible."}
            </p>
            <p className="text-sm text-tiki-brown/60 mt-1">
              {settings.enabled
                ? "Admin and API routes remain fully accessible. Only public-facing pages are covered."
                : "All public pages are visible. Turn the cover page ON to hide the site behind the unveiling experience."}
            </p>
          </div>
        </div>
      </div>

      {/* Safety note — always visible */}
      <div className="rounded-xl bg-pineapple-yellow/12 border border-pineapple-yellow/30 px-4 py-3 flex gap-3 items-start">
        <span className="text-base flex-shrink-0" aria-hidden="true">⚠️</span>
        <p className="text-xs text-tiki-brown/70 leading-relaxed">
          <strong className="text-tiki-brown">The countdown does not automatically reveal the website.</strong>{" "}
          When the countdown reaches zero, the completion message is shown — but
          the cover page stays ON until you manually turn it OFF here.
        </p>
      </div>

      <AdminCoverForm initial={settings} />
    </div>
  );
}
