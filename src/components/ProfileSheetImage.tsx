"use client";

import { useState } from "react";

type Props = {
  src?: string;
  alt: string;
  accentColor: string;
  characterName: string;
  slug: string;
};

export default function ProfileSheetImage({
  src,
  alt,
  accentColor,
  characterName,
  slug,
}: Props) {
  const [failed, setFailed] = useState(false);
  const hasImage = src && !failed;

  if (hasImage) {
    return (
      <div className="w-full rounded-2xl overflow-hidden bg-white border border-tiki-brown/10 shadow-sm">
        {/* Standard img tag preserves natural image proportions without requiring preset dimensions */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="w-full h-auto block"
          style={{ maxHeight: "85vh", objectFit: "contain" }}
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div
      className="w-full rounded-2xl flex flex-col items-center justify-center gap-4 py-16 px-8 border-2 border-dashed text-center"
      style={{
        backgroundColor: `${accentColor}10`,
        borderColor: `${accentColor}35`,
      }}
    >
      <span className="text-5xl" role="img" aria-label="art palette">🎨</span>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold text-tiki-brown/60">
          Official {characterName} profile sheet coming soon
        </p>
        <p className="text-xs text-tiki-brown/40">
          Drop the file at:
        </p>
        <code className="text-xs font-mono text-tiki-brown/55 bg-white/70 px-3 py-2 rounded-xl border border-tiki-brown/10">
          public/characters/{slug}/profile-sheet.png
        </code>
      </div>
    </div>
  );
}
