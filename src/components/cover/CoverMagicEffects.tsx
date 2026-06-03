"use client";

import { useState, useEffect, useRef } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─────────────────────────────────────────────────────────────────────────────
// Effect 1 — Sparkle Orbit
// Picks one of the three sparkle-trail images, positions it near the top of
// the page, and plays a CSS keyframe sweep (left→right or right→left).
// Fires every 7–13 s; each burst lasts ~4.2 s (the animation duration).
// ─────────────────────────────────────────────────────────────────────────────

const SPARKLE_IMGS = [
  "/cover-effects/magic-sparkle-trail-1.png",
  "/cover-effects/magic-sparkle-trail-2.png",
  "/cover-effects/magic-sparkle-trail-3.png",
] as const;

const SPARKLE_CONFIGS: Array<{
  direction: "right" | "left";
  top: string;
  left?: string;
  right?: string;
}> = [
  { direction: "right", top: "5%",  left: "-6%"  },
  { direction: "left",  top: "9%",  right: "-6%" },
  { direction: "right", top: "20%", left: "0%"   },
  { direction: "left",  top: "3%",  right: "0%"  },
];

function CoverSparkleOrbit() {
  const [active, setActive] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);
  const [cfgIdx, setCfgIdx] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;

    function schedule() {
      t1 = setTimeout(() => {
        if (!mountedRef.current) return;
        setImgIdx(rand(0, SPARKLE_IMGS.length - 1));
        setCfgIdx(rand(0, SPARKLE_CONFIGS.length - 1));
        setRunKey((k) => k + 1); // changing key remounts → CSS animation restarts
        setActive(true);

        t2 = setTimeout(() => {
          if (!mountedRef.current) return;
          setActive(false);
          schedule();
        }, 4200);
      }, rand(7000, 13000));
    }

    schedule();
    return () => {
      mountedRef.current = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!active) return null;

  const cfg = SPARKLE_CONFIGS[cfgIdx];

  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none select-none"
      style={{
        top: cfg.top,
        left: cfg.left,
        right: cfg.right,
        zIndex: 6,
        width: "clamp(130px, 17vw, 230px)",
      }}
    >
      {/* key change forces React to remount this img, restarting the CSS animation */}
      <img
        key={runKey}
        src={SPARKLE_IMGS[imgIdx]}
        alt=""
        loading="lazy"
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          animation: `cover-sparkle-sweep-${cfg.direction} 4.2s ease-in-out forwards`,
          filter:
            "drop-shadow(0 0 10px rgba(255,214,79,0.80)) drop-shadow(0 0 22px rgba(255,240,150,0.55))",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Effect 2 — Pineapple Baby Silhouette
// Alternates between the soft-shadow and the crisper silhouette asset.
// Fades in very slowly (4 s), floats gently while visible, fades out (4 s).
// Fires every 12–22 s and stays visible for 9–13 s.
// ─────────────────────────────────────────────────────────────────────────────

type SilhouettePhase = "hidden" | "showing" | "hiding";

function CoverSilhouetteEffect() {
  const [phase, setPhase] = useState<SilhouettePhase>("hidden");
  const [useShadow, setUseShadow] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;

    function schedule() {
      t1 = setTimeout(() => {
        if (!mountedRef.current) return;
        setUseShadow((v) => !v);
        setPhase("showing");

        t2 = setTimeout(() => {
          if (!mountedRef.current) return;
          setPhase("hiding");

          t3 = setTimeout(() => {
            if (!mountedRef.current) return;
            setPhase("hidden");
            schedule();
          }, 4000);
        }, rand(9000, 13000));
      }, rand(12000, 22000));
    }

    schedule();
    return () => {
      mountedRef.current = false;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  // Always render so the CSS transition has a previous opacity value to animate from
  const imgSrc = useShadow
    ? "/cover-effects/pineapple-baby-soft-shadow.png"
    : "/cover-effects/pineapple-baby-silhouette.png";
  const peakOpacity = useShadow ? 0.13 : 0.10;
  const imgOpacity = phase === "showing" ? peakOpacity : 0;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none flex items-center justify-center"
      style={{ zIndex: 1 }}
    >
      <img
        src={imgSrc}
        alt=""
        loading="lazy"
        style={{
          width: "min(65vw, 400px)",
          height: "auto",
          opacity: imgOpacity,
          transition: "opacity 4s ease-in-out",
          animation:
            phase === "showing"
              ? "cover-silhouette-float 9s ease-in-out infinite"
              : "none",
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Effect 3 — Page Crease + Eyes Peek
// Sequence: small crease → small crease with eyes → open crease with eyes → fade out.
// All three images are always in the DOM and crossfade via opacity transitions,
// which prevents flicker on image swaps (images preload in the background).
// Fires every 22–38 s; the full sequence takes ~7–10 s.
// Positioned at the bottom-right corner to mimic a page being peeked behind.
// ─────────────────────────────────────────────────────────────────────────────

type CreasePhase = "hidden" | "small" | "small-eyes" | "open-eyes" | "fading";

function CoverCreasePeek() {
  const [phase, setPhase] = useState<CreasePhase>("hidden");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;
    let t4: ReturnType<typeof setTimeout>;
    let t5: ReturnType<typeof setTimeout>;

    function schedule() {
      t1 = setTimeout(() => {
        if (!mountedRef.current) return;
        setPhase("small");

        t2 = setTimeout(() => {
          if (!mountedRef.current) return;
          setPhase("small-eyes");

          t3 = setTimeout(() => {
            if (!mountedRef.current) return;
            setPhase("open-eyes");

            t4 = setTimeout(() => {
              if (!mountedRef.current) return;
              setPhase("fading");

              t5 = setTimeout(() => {
                if (!mountedRef.current) return;
                setPhase("hidden");
                schedule();
              }, 1500);
            }, rand(2200, 3400));
          }, rand(1400, 2000));
        }, rand(1200, 1800));
      }, rand(22000, 38000));
    }

    schedule();
    return () => {
      mountedRef.current = false;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
    };
  }, []);

  // Container fades in fast on entry, fades out slowly on exit
  const containerOpacity = phase === "fading" ? 0 : phase === "hidden" ? 0 : 1;
  const containerTransition =
    phase === "fading" ? "opacity 1.5s ease-in-out" : "opacity 0.5s ease-in-out";

  const showSmall     = phase === "small";
  const showSmallEyes = phase === "small-eyes";
  const showOpenEyes  = phase === "open-eyes" || phase === "fading";

  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none select-none"
      style={{
        bottom: 0,
        right: 0,
        zIndex: 3,
        width: "clamp(150px, 26vw, 270px)",
        opacity: containerOpacity,
        transition: containerTransition,
      }}
    >
      {/* Stack all three crease images so they can crossfade cleanly */}
      <div style={{ position: "relative" }}>
        {/* Base image — sits in normal flow and defines the container height */}
        <img
          src="/cover-effects/page-crease-small.png"
          alt=""
          loading="lazy"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
            opacity: showSmall ? 1 : 0,
            transition: "opacity 0.6s ease-in-out",
          }}
        />
        {/* Overlay 1 — small crease with eyes */}
        <img
          src="/cover-effects/page-crease-small-with-eyes.png"
          alt=""
          loading="lazy"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "bottom right",
            opacity: showSmallEyes ? 1 : 0,
            transition: "opacity 0.6s ease-in-out",
          }}
        />
        {/* Overlay 2 — open crease with eyes */}
        <img
          src="/cover-effects/page-crease-open-with-eyes.png"
          alt=""
          loading="lazy"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "bottom right",
            opacity: showOpenEyes ? 1 : 0,
            transition: "opacity 0.6s ease-in-out",
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root export — mounts all three effects; returns nothing if reduced motion
// ─────────────────────────────────────────────────────────────────────────────

export default function CoverMagicEffects() {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return null;

  return (
    <>
      <CoverSparkleOrbit />
      <CoverSilhouetteEffect />
      <CoverCreasePeek />
    </>
  );
}
