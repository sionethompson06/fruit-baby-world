import type { Metadata } from "next";
import Link from "next/link";
import { buildMediaLibrary, getMediaLibrarySummary } from "@/lib/mediaLibrary";
import MediaLibraryClient from "./MediaLibraryClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Media Studio | Admin",
};

export default function MediaStudioPage() {
  let items = buildMediaLibrary();
  const summary = getMediaLibrarySummary(items);

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* Header */}
      <section className="bg-gradient-to-b from-ube-purple/10 via-bg-cream to-bg-cream py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors mb-6"
          >
            ← Back to Dashboard
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">
              Admin Only
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/60 uppercase tracking-wide">
              Read Only
            </span>
          </div>

          <div className="text-4xl mb-3">🎞️</div>
          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
            Media Studio
          </h1>
          <p className="text-tiki-brown/70 text-base leading-relaxed max-w-xl">
            View story panels, audio narration, animated clips, final videos, product
            mockups, and character references across the Fruit Baby production system.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/admin/media-health"
              className="inline-flex items-center gap-2 bg-white border border-tiki-brown/15 text-tiki-brown/70 font-semibold text-sm px-4 py-2 rounded-full shadow-sm hover:bg-tiki-brown/5 transition-colors"
            >
              🩺 Media Health →
            </Link>
            <p className="text-xs text-tiki-brown/40">
              Use Media Health to find readiness issues and missing media.
            </p>
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 pb-16">
        <MediaLibraryClient items={items} summary={summary} />
      </section>

    </div>
  );
}
