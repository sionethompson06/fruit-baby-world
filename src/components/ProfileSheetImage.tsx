"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src?: string;
  alt: string;
  accentColor: string;
};

export default function ProfileSheetImage({ src, alt, accentColor }: Props) {
  const [failed, setFailed] = useState(false);

  const hasImage = src && !failed;

  if (hasImage) {
    return (
      <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border-2 border-white shadow-md">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain"
          onError={() => setFailed(true)}
          sizes="(max-width: 768px) 100vw, 400px"
        />
      </div>
    );
  }

  return (
    <div
      className="w-full aspect-[3/4] rounded-2xl flex flex-col items-center justify-center gap-3 border-2 border-dashed"
      style={{
        backgroundColor: `${accentColor}15`,
        borderColor: `${accentColor}40`,
      }}
    >
      <span className="text-4xl">🎨</span>
      <p className="text-sm font-semibold text-tiki-brown/50 text-center px-4">
        Official profile sheet
        <br />
        coming soon
      </p>
    </div>
  );
}
