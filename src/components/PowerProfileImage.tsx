"use client";

import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  accentColor: string;
};

export default function PowerProfileImage({ src, alt, accentColor }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="w-full rounded-2xl flex items-center justify-center py-12 px-6 border-2 border-dashed text-center"
        style={{
          backgroundColor: `${accentColor}10`,
          borderColor: `${accentColor}35`,
        }}
      >
        <p className="text-sm text-tiki-brown/50 italic">Power profile coming soon.</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl overflow-hidden bg-white border border-tiki-brown/10 shadow-sm">
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
