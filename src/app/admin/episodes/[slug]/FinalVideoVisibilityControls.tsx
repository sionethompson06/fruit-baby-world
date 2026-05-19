"use client";
import React, { useState } from "react";
import { getMediaLifecycleLabel, getMediaLifecycleBadgeClass } from "@/lib/mediaLifecycle";

type FinalVideo = Record<string, any> | null;

export default function FinalVideoVisibilityControls({ finalVideo, episodeSlug }: { finalVideo: FinalVideo; episodeSlug: string }) {
  const [fv, setFv] = useState<FinalVideo>(finalVideo);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!fv) return null;

  const visibility = typeof fv.visibility === "string" ? fv.visibility : "admin-only";
  const label = getMediaLifecycleLabel(visibility === "admin-only" ? "attached-to-episode" : (visibility as any));
  const badgeClass = getMediaLifecycleBadgeClass(visibility === "admin-only" ? "attached-to-episode" : (visibility as any));

  async function updateVisibility(next: "admin-only" | "public-ready" | "hidden") {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/github/update-final-video-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeSlug, visibility: next }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setMessage(data?.message || data?.status || "Failed to update visibility.");
      } else {
        setFv({ ...(fv as Record<string, unknown>), visibility: next, visibilityUpdatedAt: new Date().toISOString() });
        setMessage("Visibility updated.");
      }
    } catch (err) {
      setMessage("Network error while updating visibility.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-tiki-brown/8 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">Final Video Visibility</p>
          <p className="text-sm text-tiki-brown/70">Public Ready final videos will appear on the public story page. Admin Only and Hidden videos stay private.</p>
        </div>
        <div className={`text-xs font-bold px-3 py-1 rounded-full ${badgeClass}`}>{label}</div>
      </div>

      <div>
        <video src={fv.url} controls playsInline preload="metadata" className="w-full rounded-xl border border-tiki-brown/10 bg-black" />
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          type="button"
          disabled={loading || visibility === "public-ready"}
          onClick={() => updateVisibility("public-ready")}
          className="rounded-2xl py-2 px-4 bg-tropical-green/15 text-tropical-green font-semibold border border-tropical-green/20 disabled:opacity-40"
        >
          Make Final Video Public Ready
        </button>

        <button
          type="button"
          disabled={loading || visibility === "admin-only"}
          onClick={() => updateVisibility("admin-only")}
          className="rounded-2xl py-2 px-4 bg-ube-purple/10 text-ube-purple font-semibold border border-ube-purple/20 disabled:opacity-40"
        >
          Set Admin Only
        </button>

        <button
          type="button"
          disabled={loading || visibility === "hidden"}
          onClick={() => updateVisibility("hidden")}
          className="rounded-2xl py-2 px-4 bg-warm-coral/10 text-warm-coral font-semibold border border-warm-coral/20 disabled:opacity-40"
        >
          Hide Final Video
        </button>
      </div>

      {message && <p className="text-sm text-tiki-brown/65">{message}</p>}
    </div>
  );
}
