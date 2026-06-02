import { getCoverPageSettings } from "@/lib/coverPage";
import AdminCoverForm from "./AdminCoverForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminCoverPage() {
  const settings = getCoverPageSettings();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-black text-tiki-brown">Cover Page</h1>
        <p className="text-sm text-tiki-brown/55 mt-1">
          When enabled, the cover page replaces the public website for all visitors.
          The countdown reaches zero automatically — but you must manually turn the
          cover page OFF to reveal the site.
        </p>
      </div>

      {/* Status banner */}
      <div
        className={`rounded-2xl px-5 py-3 text-sm font-bold ${
          settings.enabled
            ? "bg-warm-coral/10 text-warm-coral border border-warm-coral/20"
            : "bg-tropical-green/10 text-tropical-green border border-tropical-green/20"
        }`}
      >
        {settings.enabled
          ? "🔴 Cover page is ON — public website is hidden from visitors."
          : "🟢 Cover page is OFF — public website is visible to everyone."}
      </div>

      <AdminCoverForm initial={settings} />
    </div>
  );
}
