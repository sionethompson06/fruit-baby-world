import React from "react";

export default function PublicFinalVideoPlayer({ video }: { video: { url: string; mimeType?: string; durationSeconds?: number } }) {
  if (!video || !video.url) return null;
  return (
    <div id="full-video" className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-black text-tiki-brown flex items-center gap-2">
            <span aria-hidden>🎞️</span> Full Video Story
          </h2>
          <p className="text-sm text-tiki-brown/60 leading-relaxed">Watch the complete story.</p>
        </div>
        <span className="flex-shrink-0 text-xs font-bold text-tropical-green bg-tropical-green/15 px-3 py-1 rounded-full">Full Video</span>
      </div>

      <div>
        <video
          src={video.url}
          controls
          playsInline
          preload="metadata"
          className="w-full rounded-2xl border border-tiki-brown/10 bg-black shadow-sm"
          aria-label="Full story video"
        >
          Your browser does not support the video element.
        </video>
      </div>
    </div>
  );
}
