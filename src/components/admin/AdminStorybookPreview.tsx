"use client";

import { useState } from "react";
import StoryExperienceSwitcher from "@/components/StoryExperienceSwitcher";
import type { StorybookReaderPage, StorybookNarrationAudioProp } from "@/components/StorybookReader";

type VideoPreviewProps = {
  videoUrl: string;
  title?: string;
  description?: string;
  mimeType?: string;
};

export default function AdminStorybookPreview({
  slug,
  episodeTitle,
  adminPreviewPages,
  narrationAudio,
  video,
  totalPageCount,
  publicPageCount,
  isPublished = false,
}: {
  slug: string;
  episodeTitle: string;
  adminPreviewPages: StorybookReaderPage[];
  narrationAudio?: StorybookNarrationAudioProp;
  video?: VideoPreviewProps;
  totalPageCount: number;
  publicPageCount: number;
  isPublished?: boolean;
}) {
  const [showDraftPreview, setShowDraftPreview] = useState(false);
  const draftOnlyCount = totalPageCount - publicPageCount;

  return (
    <div className="flex flex-col gap-5">

      {/* Status summary */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
        {([
          {
            label: "Total Images",
            value: String(totalPageCount),
            icon: "🖼️",
            variant: totalPageCount > 0 ? "normal" : "muted",
          },
          {
            label: "Public",
            value: String(publicPageCount),
            icon: "✅",
            variant: publicPageCount > 0 ? "green" : "muted",
          },
          {
            label: "Draft/Hidden",
            value: String(draftOnlyCount),
            icon: "🔒",
            variant: draftOnlyCount > 0 ? "normal" : "muted",
          },
          {
            label: "Audio",
            value: narrationAudio ? "Attached" : "None",
            icon: "🎙️",
            variant: narrationAudio ? "green" : "muted",
          },
          {
            label: "Video",
            value: video ? "Attached" : "None",
            icon: "🎬",
            variant: video ? "green" : "muted",
          },
        ] as const).map(({ label, value, icon, variant }) => (
          <div
            key={label}
            className={`flex flex-col gap-1 rounded-2xl border px-3 py-2.5 ${
              variant === "green"
                ? "border-tropical-green/30 bg-tropical-green/8"
                : variant === "muted"
                ? "border-tiki-brown/8 bg-tiki-brown/2"
                : "border-tiki-brown/12 bg-tiki-brown/3"
            }`}
          >
            <span className="text-base leading-none">{icon}</span>
            <span className={`text-xs font-bold leading-tight tabular-nums ${
              variant === "green" ? "text-tropical-green" : "text-tiki-brown/65"
            }`}>
              {value}
            </span>
            <span className="text-[10px] text-tiki-brown/40 leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* Public preview warnings */}
      {totalPageCount > 0 && publicPageCount === 0 && (
        <div className="flex items-start gap-2.5 bg-pineapple-yellow/15 border border-pineapple-yellow/40 rounded-2xl px-4 py-3">
          <span className="text-base flex-shrink-0">⚠️</span>
          <p className="text-xs text-tiki-brown/65 leading-relaxed">
            <span className="font-bold">Your public page may appear empty.</span>{" "}
            Mark book images <span className="font-bold">Approved + Public</span> in the Book Images section to make them visible to readers.
          </p>
        </div>
      )}
      {publicPageCount > 0 && draftOnlyCount > 0 && (
        <div className="flex items-start gap-2.5 bg-sky-blue/10 border border-sky-blue/20 rounded-2xl px-4 py-3">
          <span className="text-base flex-shrink-0">ℹ️</span>
          <p className="text-xs text-tiki-brown/65 leading-relaxed">
            Public preview currently shows{" "}
            <span className="font-bold">{publicPageCount} of {totalPageCount}</span> book images.{" "}
            {draftOnlyCount} {draftOnlyCount === 1 ? "image is" : "images are"} draft/hidden and will not appear publicly.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => setShowDraftPreview((v) => !v)}
          className={`flex items-center justify-center gap-2 text-sm font-bold px-5 py-2.5 rounded-2xl transition-colors ${
            showDraftPreview
              ? "bg-tiki-brown/12 text-tiki-brown border border-tiki-brown/20 hover:bg-tiki-brown/18"
              : "bg-ube-purple text-white hover:bg-ube-purple/85"
          }`}
        >
          <span aria-hidden>{showDraftPreview ? "🙈" : "👁️"}</span>
          {showDraftPreview ? "Hide Draft Preview" : "Preview Draft in Builder"}
        </button>
        {isPublished ? (
          <a
            href={`/stories/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm font-bold px-5 py-2.5 rounded-2xl bg-white border border-tiki-brown/15 text-tiki-brown/70 hover:text-tiki-brown hover:border-tiki-brown/30 transition-colors"
          >
            <span aria-hidden>🌐</span>
            Open Public Preview
          </a>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm font-bold px-5 py-2.5 rounded-2xl bg-tiki-brown/4 border border-tiki-brown/10 text-tiki-brown/35 cursor-default select-none">
            <span aria-hidden>🌐</span>
            <span>Public Preview</span>
            <span className="text-xs font-normal text-tiki-brown/30">(not published)</span>
          </div>
        )}
      </div>

      {/* Inline draft preview */}
      {showDraftPreview && (
        <div className="flex flex-col gap-4">
          {/* Admin-only badge */}
          <div className="flex items-center gap-2 bg-ube-purple/8 border border-ube-purple/15 rounded-xl px-4 py-2.5">
            <span className="text-sm flex-shrink-0" aria-hidden>🔒</span>
            <p className="text-xs font-bold text-ube-purple">
              Admin Draft Preview — not public. Showing all non-archived pages including draft and hidden.
            </p>
          </div>

          {adminPreviewPages.length === 0 ? (
            <div className="flex items-center justify-center h-28 rounded-2xl bg-tiki-brown/4 border border-dashed border-tiki-brown/15">
              <p className="text-sm text-tiki-brown/40 font-semibold">
                Upload book images first.
              </p>
            </div>
          ) : (
            <StoryExperienceSwitcher
              pages={adminPreviewPages}
              episodeTitle={episodeTitle}
              backHref={`/admin/storybooks/${slug}/builder`}
              narrationAudio={narrationAudio}
              video={video}
            />
          )}
        </div>
      )}

      {/* Public preview note */}
      <div className="flex items-start gap-2.5 bg-tiki-brown/3 border border-tiki-brown/8 rounded-xl px-4 py-3">
        <span className="text-sm flex-shrink-0" aria-hidden>🌐</span>
        <p className="text-xs text-tiki-brown/50 leading-relaxed">
          {isPublished ? (
            <>
              <span className="font-semibold text-tiki-brown/70">Open Public Preview</span> opens{" "}
              <span className="font-mono text-tiki-brown/55">/stories/{slug}</span> in a new tab.
              Only <span className="font-semibold">approved + public</span> pages and media appear there.
            </>
          ) : (
            <>
              <span className="font-semibold text-tiki-brown/70">Public Preview</span> is unavailable until the storybook is published.
              Use <span className="font-semibold">Preview Draft in Builder</span> above to review draft pages, then publish below.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
