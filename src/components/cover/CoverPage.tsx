import type { CoverPageSettings } from "@/lib/coverPageTypes";
import CoverCountdown from "./CoverCountdown";

export default function CoverPage({ settings }: { settings: CoverPageSettings }) {
  return (
    <div
      className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-16 text-center"
      style={{
        background:
          "linear-gradient(180deg, #dff7ff 0%, #f4fbff 50%, #fffde8 100%)",
      }}
    >
      {/* Eyebrow */}
      <p
        className="text-base sm:text-lg text-tiki-brown/55 mb-4 tracking-wide"
        style={{ fontFamily: "var(--font-margarine)" }}
      >
        {settings.eyebrow}
      </p>

      {/* Title */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
        <span className="title-charm title-charm-sparkle" aria-hidden="true">
          ✨
        </span>
        <h1 className="brand-bubblegum-title brand-bubblegum-title--hero text-4xl sm:text-6xl leading-tight max-w-3xl">
          <span className="brand-word-pineapple">Pineapple </span>
          <span className="brand-word-baby">Baby </span>
          <span className="brand-word-pink">and the </span>
          <span className="brand-word-fruit">Fruit Baby </span>
          <span className="brand-word-universe">Universe</span>
        </h1>
        <span className="title-charm title-charm-heart" aria-hidden="true">
          ♥
        </span>
      </div>

      {/* Subtitle */}
      <p className="text-tiki-brown/60 text-base sm:text-xl leading-relaxed max-w-xl mb-14">
        {settings.subtitle}
      </p>

      {/* Countdown */}
      <div className="mb-16">
        <CoverCountdown
          unveilingAt={settings.unveilingAt}
          countdownLabel={settings.countdownLabel}
          completeMessage={settings.completeMessage}
          completeSubtext={settings.completeSubtext}
        />
      </div>

      {/* Video placeholder (no upload in Phase 1) */}
      <div className="w-full max-w-2xl">
        <h2
          className="text-lg font-black text-tiki-brown mb-4"
          style={{ fontFamily: "var(--font-bubblegum-sans)" }}
        >
          {settings.videoSectionTitle}
        </h2>
        <div className="aspect-video rounded-3xl bg-pineapple-yellow/15 border-2 border-dashed border-pineapple-yellow/40 flex items-center justify-center">
          <p className="text-tiki-brown/40 font-semibold text-sm sm:text-base px-8">
            🌿 {settings.videoPlaceholderText}
          </p>
        </div>
      </div>
    </div>
  );
}
