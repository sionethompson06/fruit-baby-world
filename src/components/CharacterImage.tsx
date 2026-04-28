"use client";

import Image from "next/image";
import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  emoji: string;
  bgColor: string;
  className?: string;
};

export default function CharacterImage({ src, alt, emoji, bgColor, className = "" }: Props) {
  const [failed, setFailed] = useState(false);

  const hasImage = src && !failed;

  if (hasImage) {
    return (
      <div className={`relative ${className}`} style={{ backgroundColor: bgColor }}>
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover object-top"
          onError={() => setFailed(true)}
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <span className="text-8xl select-none" role="img" aria-label={alt}>
        {emoji}
      </span>
    </div>
  );
}
