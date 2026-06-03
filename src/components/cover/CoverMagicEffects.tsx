"use client";

import { useState, useEffect, useRef, useMemo } from "react";

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

function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

// ─────────────────────────────────────────────────────────────────────────────
// Effect 1 — Stardust Trail (CSS-generated particles)
//
// Each burst generates TRAIL_COUNT small particle elements. Staggered
// animation delays create the sweep illusion without moving a container.
// Mode "sweep-right/left": particles spread across a horizontal band,
// delays increase left→right (or right→left) so the active glow travels.
// Mode "orbit": particles on an ellipse around the countdown area, delays
// increase around the arc so a sparkle appears to orbit the cards.
// ─────────────────────────────────────────────────────────────────────────────

const TRAIL_COUNT = 20;
const SWEEP_MS    = 2600; // how long the leading edge takes to cross the page
const ORBIT_MS    = 3000; // one orbit sweep duration

interface StarParticle {
  // sweep: xPct (0-100 % across container), orbit: xPx/yPx from center
  xPct: number;
  xPx:  number;
  yPx:  number;
  y:    number;   // cross-trail scatter px
  size: number;
  delay: number;
  dur:   number;
  opk:   number;  // peak opacity
  isStar: boolean;
}

function buildSweep(dir: "right" | "left"): StarParticle[] {
  return Array.from({ length: TRAIL_COUNT }, (_, i) => {
    const t   = i / (TRAIL_COUNT - 1);
    const xPct = dir === "right" ? t * 100 : (1 - t) * 100;
    return {
      xPct, xPx: 0, yPx: 0,
      y:      rand(-24, 24),
      size:   rand(3, 7),
      delay:  t * SWEEP_MS + rand(-100, 100),
      dur:    rand(700, 1100),
      opk:    randFloat(0.75, 1.0),
      isStar: i % 5 === 0,
    };
  });
}

function buildOrbit(): StarParticle[] {
  const N = 16, rx = 220, ry = 80;
  return Array.from({ length: N }, (_, i) => {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
    return {
      xPct: 50,
      xPx: rx * Math.cos(angle),
      yPx: ry * Math.sin(angle),
      y: 0,
      size:  rand(3, 6),
      delay: (i / N) * ORBIT_MS + rand(-50, 50),
      dur:   rand(700, 1000),
      opk:   randFloat(0.80, 1.0),
      isStar: i % 4 === 0,
    };
  });
}

const SWEEP_TOPS = ["7%", "13%", "22%", "5%"];

function StarParticleEl({ p }: { p: StarParticle }) {
  const glow = `drop-shadow(0 0 ${p.size}px rgba(255,214,79,0.95)) drop-shadow(0 0 ${p.size * 2}px rgba(255,240,150,0.65))`;
  const anim = `cover-particle-twinkle ${p.dur}ms ease-in-out ${p.delay}ms both`;

  if (p.isStar) {
    return (
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          fontSize: p.size * 2.5,
          lineHeight: 1,
          color: "#ffd84d",
          filter: glow,
          userSelect: "none",
          opacity: 0,
          animation: anim,
          transform: "translate(-50%, -50%)",
        }}
      >
        ✦
      </span>
    );
  }
  return (
    <div
      style={{
        position: "absolute",
        width:  p.size,
        height: p.size,
        borderRadius: "50%",
        background: "radial-gradient(circle, #fffde0 0%, #ffd84d 55%, rgba(255,160,0,0.15) 100%)",
        boxShadow: `0 0 ${p.size * 2}px rgba(255,214,79,0.95), 0 0 ${p.size * 4}px rgba(255,240,150,0.6)`,
        opacity: 0,
        animation: anim,
        transform: "translate(-50%, -50%)",
      }}
    />
  );
}

type TrailMode = "sweep-right" | "sweep-left" | "orbit";
const TRAIL_MODES: TrailMode[] = [
  "sweep-right", "sweep-right",
  "sweep-left",  "sweep-left",
  "orbit",
];

function CoverStardustTrail() {
  const [active,  setActive]  = useState(false);
  const [runKey,  setRunKey]  = useState(0);
  const [mode,    setMode]    = useState<TrailMode>("sweep-right");
  const [topIdx,  setTopIdx]  = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;

    function schedule() {
      t1 = setTimeout(() => {
        if (!mountedRef.current) return;
        const nextMode = TRAIL_MODES[rand(0, TRAIL_MODES.length - 1)];
        setMode(nextMode);
        setTopIdx(rand(0, SWEEP_TOPS.length - 1));
        setRunKey(k => k + 1);
        setActive(true);

        const visFor = nextMode === "orbit"
          ? ORBIT_MS + 1200
          : SWEEP_MS  + 1400;

        t2 = setTimeout(() => {
          if (!mountedRef.current) return;
          setActive(false);
          schedule();
        }, visFor);
      }, rand(7000, 12000));
    }

    schedule();
    return () => {
      mountedRef.current = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Particles are rebuilt only when a new burst fires (runKey change).
  // mode is included so the memo sees the correct latest value.
  const particles = useMemo(() => {
    if (mode === "orbit")       return buildOrbit();
    if (mode === "sweep-left")  return buildSweep("left");
    return buildSweep("right");
  }, [runKey, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null;

  // Orbit: container is a zero-size point at the countdown center
  if (mode === "orbit") {
    return (
      <div
        aria-hidden="true"
        className="absolute pointer-events-none select-none"
        style={{ top: "34%", left: "50%", width: 0, height: 0, zIndex: 8 }}
      >
        {particles.map((p, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.xPx,
              top:  p.yPx,
            }}
          >
            <StarParticleEl p={p} />
          </div>
        ))}
      </div>
    );
  }

  // Sweep: full-width band, particles spread left→right or right→left
  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none select-none"
      style={{
        top:    SWEEP_TOPS[topIdx],
        left:   0,
        right:  0,
        height: "70px",
        zIndex: 8,
        overflow: "visible",
      }}
    >
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position:  "absolute",
            left:      `${p.xPct}%`,
            top:       `calc(50% + ${p.y}px)`,
          }}
        >
          <StarParticleEl p={p} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Effect 2 — Silhouette Peek
//
// Six safe zones around the page edges (upper-left, upper-right, mid-left,
// mid-right, lower-left, lower-right). A zone is randomly selected each
// appearance so the silhouette is never in the same place twice in a row.
// Zones avoid the title text center and the video player area.
// ─────────────────────────────────────────────────────────────────────────────

const SILHOUETTE_ZONES = [
  { top: "4%",  left: "0%",       right: undefined  }, // upper-left
  { top: "4%",  left: undefined,  right: "0%"       }, // upper-right
  { top: "28%", left: "0%",       right: undefined  }, // mid-left (near countdown)
  { top: "28%", left: undefined,  right: "0%"       }, // mid-right (near countdown)
  { top: "50%", left: "0%",       right: undefined  }, // lower-left (above video)
  { top: "50%", left: undefined,  right: "0%"       }, // lower-right (above video)
] as const;

type SilhouettePhase = "hidden" | "showing" | "hiding";

function CoverSilhouettePeek() {
  const [phase,      setPhase]     = useState<SilhouettePhase>("hidden");
  const [useShadow,  setUseShadow] = useState(true);
  const [zoneIdx,    setZoneIdx]   = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;

    function schedule() {
      t1 = setTimeout(() => {
        if (!mountedRef.current) return;
        setUseShadow(v => !v);
        setZoneIdx(rand(0, SILHOUETTE_ZONES.length - 1));
        setPhase("showing");

        t2 = setTimeout(() => {
          if (!mountedRef.current) return;
          setPhase("hiding");

          t3 = setTimeout(() => {
            if (!mountedRef.current) return;
            setPhase("hidden");
            schedule();
          }, 3500);
        }, rand(6000, 9000));
      }, rand(15000, 28000));
    }

    schedule();
    return () => {
      mountedRef.current = false;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const zone      = SILHOUETTE_ZONES[zoneIdx];
  const imgSrc    = useShadow
    ? "/cover-effects/pineapple-baby-soft-shadow.png"
    : "/cover-effects/pineapple-baby-silhouette.png";
  const peakOpacity = useShadow ? 0.18 : 0.15;

  // Always rendered so the CSS opacity transition has a prior value to interpolate from
  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none select-none"
      style={{
        top:   zone.top,
        left:  zone.left,
        right: zone.right,
        zIndex: 2,
        width: "clamp(100px, 18vw, 220px)",
      }}
    >
      <img
        src={imgSrc}
        alt=""
        loading="lazy"
        style={{
          width:      "100%",
          height:     "auto",
          opacity:    phase === "showing" ? peakOpacity : 0,
          transition: "opacity 3s ease-in-out",
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
//
// Previous version was broken for two reasons:
//   1. bottom:0 on a min-height:100dvh container = well below the fold.
//   2. zIndex:3 is below the z-10 content layer so it was invisible.
// Fixed: top-anchored positions in the hero/countdown band, zIndex:20.
//
// Sequence: hidden → small crease → small crease + eyes → open crease + eyes
//           → fade out → hidden.  All three images stay in the DOM so
//           crossfade transitions work without flicker.
// Fires every 25–42 s; alternates left/right side.
// ─────────────────────────────────────────────────────────────────────────────

type CreasePhase = "hidden" | "small" | "small-eyes" | "open-eyes" | "fading";

const CREASE_POS = [
  { top: "13%", side: "right" as const },
  { top: "20%", side: "left"  as const },
  { top: "17%", side: "right" as const },
  { top: "10%", side: "left"  as const },
];

function CoverCreasePeek() {
  const [phase,  setPhase]  = useState<CreasePhase>("hidden");
  const [posIdx, setPosIdx] = useState(0);
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
        setPosIdx(rand(0, CREASE_POS.length - 1));
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
            }, rand(2500, 3500));
          }, rand(1400, 2000));
        }, rand(1200, 1800));
      }, rand(25000, 42000));
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

  const pos = CREASE_POS[posIdx];

  // Container manages the entry/exit fade; inner images crossfade individually
  const containerOpacity =
    phase === "fading" ? 0 : phase === "hidden" ? 0 : 1;
  const containerTransition =
    phase === "fading"
      ? "opacity 1.5s ease-in-out"
      : "opacity 0.5s ease-in-out";

  const showSmall     = phase === "small";
  const showSmallEyes = phase === "small-eyes";
  const showOpenEyes  = phase === "open-eyes" || phase === "fading";

  const objectPos = pos.side === "right" ? "top right" : "top left";

  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none select-none"
      style={{
        top:    pos.top,
        left:   pos.side === "left"  ? 0 : undefined,
        right:  pos.side === "right" ? 0 : undefined,
        // zIndex 20 — above content layer (z-10) so the crease is clearly visible
        zIndex: 20,
        width:  "clamp(220px, 30vw, 340px)",
        opacity:    containerOpacity,
        transition: containerTransition,
      }}
    >
      <div style={{ position: "relative" }}>
        {/* Base image defines the container height */}
        <img
          src="/cover-effects/page-crease-small.png"
          alt=""
          loading="lazy"
          style={{
            width: "100%", height: "auto", display: "block",
            opacity:    showSmall ? 1 : 0,
            transition: "opacity 0.6s ease-in-out",
          }}
        />
        <img
          src="/cover-effects/page-crease-small-with-eyes.png"
          alt=""
          loading="lazy"
          style={{
            position: "absolute", top: 0, left: 0,
            width: "100%", height: "100%",
            objectFit: "contain", objectPosition: objectPos,
            opacity:    showSmallEyes ? 1 : 0,
            transition: "opacity 0.6s ease-in-out",
          }}
        />
        <img
          src="/cover-effects/page-crease-open-with-eyes.png"
          alt=""
          loading="lazy"
          style={{
            position: "absolute", top: 0, left: 0,
            width: "100%", height: "100%",
            objectFit: "contain", objectPosition: objectPos,
            opacity:    showOpenEyes ? 1 : 0,
            transition: "opacity 0.6s ease-in-out",
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root export
// ─────────────────────────────────────────────────────────────────────────────

export default function CoverMagicEffects() {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return null;

  return (
    <>
      <CoverStardustTrail />
      <CoverSilhouettePeek />
      <CoverCreasePeek />
    </>
  );
}
