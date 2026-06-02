import type { CoverPageSettings } from "@/lib/coverPageTypes";
import { getActiveCoverVideos } from "@/lib/coverPage";
import CoverCountdown from "./CoverCountdown";
import CoverVideoPlayer from "./CoverVideoPlayer";

export default function CoverPage({ settings }: { settings: CoverPageSettings }) {
  const activeVideos = getActiveCoverVideos(settings);

  return (
    <div
      className="flex flex-col items-center px-4 py-14 text-center"
      style={{
        background:
          "linear-gradient(180deg, #dff7ff 0%, #f4fbff 50%, #fffde8 100%)",
        minHeight: "calc(100vh - 64px)",
      }}
    >
      {/* Eyebrow */}
      <p
        className="text-base sm:text-lg text-tiki-brown/55 mb-3 tracking-wide"
        style={{ fontFamily: "var(--font-margarine)" }}
      >
        {settings.eyebrow}
      </p>

      {/* Title */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
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
      <p className="text-tiki-brown/60 text-base sm:text-xl leading-relaxed max-w-xl mb-10">
        {settings.subtitle}
      </p>

      {/* Countdown */}
      <div className="mb-12">
        <CoverCountdown
          unveilingAt={settings.unveilingAt}
          countdownLabel={settings.countdownLabel}
          completeMessage={settings.completeMessage}
          completeSubtext={settings.completeSubtext}
        />
      </div>

      {/* Sneak Peek Theater — video player or placeholder */}
      <div className="w-full max-w-4xl">
        {activeVideos.length > 0 ? (
          <CoverVideoPlayer
            videos={activeVideos}
            videoLoop={settings.videoLoop}
            autoplayMuted={settings.autoplayMuted}
            videoSectionTitle={settings.videoSectionTitle}
          />
        ) : (
          <div>
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
        )}
      </div>
    </div>
  );
}
