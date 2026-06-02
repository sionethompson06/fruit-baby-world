"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CoverPageSettings } from "@/lib/coverPageTypes";

function toDatetimeLocal(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function fromDatetimeLocal(local: string): string {
  if (!local) return "";
  return new Date(local).toISOString();
}

export default function AdminCoverForm({
  initial,
}: {
  initial: CoverPageSettings;
}) {
  const router = useRouter();
  const [settings, setSettings] = useState<CoverPageSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  function set<K extends keyof CoverPageSettings>(key: K, value: CoverPageSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setResult(null);
  }

  async function handleSave() {
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch("/api/github/save-cover-page-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      setResult({
        ok: data.ok,
        message: data.ok ? "Settings saved successfully." : (data.message ?? "Save failed."),
      });
      if (data.ok) router.refresh();
    } catch {
      setResult({ ok: false, message: "Network error — please try again." });
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-tiki-brown/15 bg-white px-3 py-2 text-sm text-tiki-brown focus:outline-none focus:ring-2 focus:ring-ube-purple/30";
  const labelClass = "block text-xs font-bold text-tiki-brown/60 uppercase tracking-wider mb-1";

  return (
    <div className="flex flex-col gap-8 max-w-2xl">

      {/* ON / OFF toggle */}
      <div className="flex items-center justify-between rounded-2xl border border-tiki-brown/10 bg-white p-5 shadow-sm">
        <div>
          <p className="font-black text-tiki-brown text-base">Cover Page</p>
          <p className="text-xs text-tiki-brown/50 mt-0.5">
            {settings.enabled
              ? "Public website is hidden — cover page is active."
              : "Cover page is off — public website is visible."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => set("enabled", !settings.enabled)}
          className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
            settings.enabled ? "bg-warm-coral" : "bg-tiki-brown/20"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              settings.enabled ? "translate-x-8" : "translate-x-1"
            }`}
          />
          <span className="sr-only">
            {settings.enabled ? "Disable cover page" : "Enable cover page"}
          </span>
        </button>
      </div>

      {/* Unveiling date */}
      <div className="rounded-2xl border border-tiki-brown/10 bg-white p-5 shadow-sm flex flex-col gap-4">
        <h2 className="font-black text-tiki-brown text-sm">Countdown</h2>
        <div>
          <label className={labelClass}>Unveiling date &amp; time</label>
          <input
            type="datetime-local"
            className={inputClass}
            value={toDatetimeLocal(settings.unveilingAt)}
            onChange={(e) => set("unveilingAt", fromDatetimeLocal(e.target.value))}
          />
          <p className="text-xs text-tiki-brown/40 mt-1">
            When the countdown reaches zero the message changes — but the cover page stays on until you manually turn it off.
          </p>
        </div>
        <div>
          <label className={labelClass}>Countdown label</label>
          <input
            type="text"
            className={inputClass}
            value={settings.countdownLabel}
            onChange={(e) => set("countdownLabel", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Complete message (shown when countdown reaches zero)</label>
          <input
            type="text"
            className={inputClass}
            value={settings.completeMessage}
            onChange={(e) => set("completeMessage", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Complete subtext</label>
          <input
            type="text"
            className={inputClass}
            value={settings.completeSubtext}
            onChange={(e) => set("completeSubtext", e.target.value)}
          />
        </div>
      </div>

      {/* Cover page copy */}
      <div className="rounded-2xl border border-tiki-brown/10 bg-white p-5 shadow-sm flex flex-col gap-4">
        <h2 className="font-black text-tiki-brown text-sm">Page copy</h2>
        <div>
          <label className={labelClass}>Eyebrow</label>
          <input
            type="text"
            className={inputClass}
            value={settings.eyebrow}
            onChange={(e) => set("eyebrow", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Title</label>
          <input
            type="text"
            className={inputClass}
            value={settings.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Subtitle</label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={2}
            value={settings.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
          />
        </div>
      </div>

      {/* Video section */}
      <div className="rounded-2xl border border-tiki-brown/10 bg-white p-5 shadow-sm flex flex-col gap-4">
        <h2 className="font-black text-tiki-brown text-sm">Video section</h2>
        <p className="text-xs text-tiki-brown/50 -mt-2">
          Video upload is coming in a future phase. These labels appear on the placeholder.
        </p>
        <div>
          <label className={labelClass}>Section title</label>
          <input
            type="text"
            className={inputClass}
            value={settings.videoSectionTitle}
            onChange={(e) => set("videoSectionTitle", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Placeholder text</label>
          <input
            type="text"
            className={inputClass}
            value={settings.videoPlaceholderText}
            onChange={(e) => set("videoPlaceholderText", e.target.value)}
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-ube-purple text-white font-black py-3 text-sm hover:bg-ube-purple/90 transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Cover Page Settings"}
        </button>
        {result && (
          <p
            className={`text-sm font-semibold text-center ${
              result.ok ? "text-tropical-green" : "text-warm-coral"
            }`}
          >
            {result.message}
          </p>
        )}
        <a
          href="/admin/cover/preview"
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-xs font-bold text-ube-purple/70 hover:text-ube-purple underline"
        >
          Preview cover page →
        </a>
      </div>
    </div>
  );
}
