import type { CoverPageSettings } from "@/lib/coverPageTypes";
import { getActiveCoverVideos } from "@/lib/coverPage";
import CoverCountdown from "./CoverCountdown";
import CoverVideoPlayer from "./CoverVideoPlayer";
import CoverMagicEffects from "./CoverMagicEffects";

// Decorative floaters — pure CSS/emoji, aria-hidden, pointer-events: none
function CoverDecorations() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Soft glow orbs */}
      <div
        className="cover-glow-orb absolute -top-20 -left-20 w-72 h-72 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,216,77,0.18) 0%, transparent 70%)" }}
      />
      <div
        className="cover-glow-orb absolute -bottom-24 -right-24 w-96 h-96 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(189,235,255,0.22) 0%, transparent 70%)",
          animationDelay: "2.5s",
        }}
      />
      <div
        className="cover-glow-orb absolute top-1/3 -right-12 w-56 h-56 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(255,184,200,0.15) 0%, transparent 70%)",
          animationDelay: "1.2s",
        }}
      />

      {/* Corner sparkles */}
      <span
        className="animate-float-gentle absolute top-6 left-6 text-5xl opacity-[0.13]"
        style={{ animationDelay: "0s", color: "#ffd84d" }}
      >
        ✨
      </span>
      <span
        className="animate-float-gentle absolute top-10 right-8 text-4xl opacity-[0.11]"
        style={{ animationDelay: "1.4s", color: "#ffb8c8" }}
      >
        ♥
      </span>
      <span
        className="animate-float-gentle absolute bottom-20 left-10 text-3xl opacity-[0.10]"
        style={{ animationDelay: "0.7s", color: "#ffd84d" }}
      >
        ★
      </span>
      <span
        className="animate-float-gentle absolute bottom-32 right-12 text-3xl opacity-[0.10]"
        style={{ animationDelay: "2.1s", color: "#bdebff" }}
      >
        ◆
      </span>
      <span
        className="animate-float-gentle absolute top-2/5 left-4 text-2xl opacity-[0.08]"
        style={{ animationDelay: "1.8s", color: "#7ac943" }}
      >
        ✦
      </span>
      <span
        className="animate-float-gentle absolute top-3/5 right-6 text-xl opacity-[0.08]"
        style={{ animationDelay: "0.4s", color: "#ffd84d" }}
      >
        ✨
      </span>

      {/* Soft dots */}
      <div className="absolute top-24 left-1/4 w-3 h-3 rounded-full opacity-10" style={{ background: "#ffd84d" }} />
      <div className="absolute top-1/3 right-1/4 w-2 h-2 rounded-full opacity-8" style={{ background: "#bdebff" }} />
      <div className="absolute bottom-40 left-1/3 w-2.5 h-2.5 rounded-full opacity-10" style={{ background: "#ffb8c8" }} />
    </div>
  );
}

export default function CoverPage({ settings }: { settings: CoverPageSettings }) {
  const activeVideos = getActiveCoverVideos(settings);

  return (
    <div
      className="relative flex flex-col items-center overflow-x-hidden"
      style={{
        background:
          "linear-gradient(180deg, #dff7ff 0%, #f4fbff 45%, #fffde8 85%, #fff9ed 100%)",
        minHeight: "100dvh",
      }}
    >
      {/* Static decorative background layer */}
      <CoverDecorations />

      {/* Animated magic effects — client-only, pointer-events:none, reduced-motion aware */}
      <CoverMagicEffects />

      {/* Page content — above decorations */}
      <div className="relative z-10 flex flex-col items-center w-full px-4 py-6 sm:py-10 text-center">

        {/* Eyebrow */}
        <p
          className="text-base sm:text-lg text-tiki-brown/60 mb-4 tracking-wide"
          style={{ fontFamily: "var(--font-margarine)" }}
        >
          {settings.eyebrow}
        </p>

        {/* Brand title — h1 for accessibility */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8 max-w-4xl">
          <span className="title-charm title-charm-sparkle" aria-hidden="true">✨</span>
          <h1 className="brand-bubblegum-title brand-bubblegum-title--hero text-4xl sm:text-6xl leading-tight">
            <span className="brand-word-pineapple">Pineapple </span>
            <span className="brand-word-baby">Baby </span>
            <span className="brand-word-pink">and the </span>
            <span className="brand-word-fruit">Fruit Baby </span>
            <span className="brand-word-universe">Universe</span>
          </h1>
          <span className="title-charm title-charm-heart" aria-hidden="true">♥</span>
        </div>

        {/* Countdown */}
        <div className="mb-8 w-full max-w-xl">
          <CoverCountdown
            unveilingAt={settings.unveilingAt}
            countdownLabel={settings.countdownLabel}
            completeMessage={settings.completeMessage}
            completeSubtext={settings.completeSubtext}
          />
        </div>

        {/* Sneak Peek Theater */}
        <section
          aria-label="Sneak Peek Theater"
          className="w-full max-w-4xl mb-10"
        >
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
                className="text-lg sm:text-xl font-black text-tiki-brown mb-5"
                style={{ fontFamily: "var(--font-bubblegum-sans)" }}
              >
                {settings.videoSectionTitle}
              </h2>

              {/* Empty state — intentional, branded, not a blank box */}
              <div
                className="w-full aspect-video rounded-3xl flex flex-col items-center justify-center gap-4 px-6"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(255,216,77,0.12) 0%, rgba(189,235,255,0.18) 50%, rgba(255,184,200,0.10) 100%)",
                  border: "2px dashed rgba(255,216,77,0.45)",
                  boxShadow: "0 4px 24px rgba(139,90,43,0.05)",
                }}
              >
                <span
                  className="text-6xl sm:text-7xl opacity-30 select-none animate-float-gentle"
                  aria-hidden="true"
                  style={{ animationDelay: "0.5s" }}
                >
                  🌿
                </span>
                <p className="text-tiki-brown/55 font-semibold text-sm sm:text-base max-w-sm">
                  {settings.videoPlaceholderText}
                </p>
                <p className="text-tiki-brown/35 text-xs sm:text-sm">
                  Come back soon for a first look.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Footer teaser */}
        {settings.footerTeaser && (
          <p className="text-xs sm:text-sm text-tiki-brown/45 font-semibold tracking-wide italic max-w-sm">
            ✨ {settings.footerTeaser}
          </p>
        )}
      </div>
    </div>
  );
}
