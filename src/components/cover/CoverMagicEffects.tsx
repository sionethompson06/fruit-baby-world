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
// Effect 0 — Ambient Shimmer (always on)
//
// 25 fixed particles scattered across the page pulsing on infinite loops with
// staggered delays. Provides a continuous "enchanted" atmosphere between sweeps.
// ─────────────────────────────────────────────────────────────────────────────

interface AmbientParticle {
  x: number;    // % across page
  y: number;    // % down page
  size: number; // px
  delay: number;
  dur: number;
  isStar: boolean;
  color: string;
}

const AMBIENT_COLORS = ["#ffd84d", "#ffecaa", "#fff8d0", "#ffc8e0", "#c8e8ff"];

function CoverAmbientShimmer() {
  // Stable on mount, regenerates only when component mounts
  const particles = useMemo<AmbientParticle[]>(() => {
    return Array.from({ length: 25 }, (_, i) => ({
      x:      randFloat(4, 96),
      y:      randFloat(2, 85),
      size:   i % 5 === 0 ? randFloat(2.5, 4.5) : randFloat(1, 2.5),
      delay:  randFloat(0, 6000),
      dur:    randFloat(2800, 5500),
      isStar: i % 4 === 0,
      color:  AMBIENT_COLORS[i % AMBIENT_COLORS.length],
    }));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      style={{ zIndex: 5 }}
    >
      {particles.map((p, i) => {
        const glow = `drop-shadow(0 0 ${p.size * 2}px ${p.color}cc)`;
        const anim = `cover-ambient-twinkle ${p.dur}ms ease-in-out ${p.delay}ms infinite both`;
        return (
          <div
            key={i}
            style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%` }}
          >
            {p.isStar ? (
              <span
                style={{
                  position: "absolute",
                  fontSize: p.size * 3.5,
                  lineHeight: 1,
                  color: p.color,
                  filter: glow,
                  userSelect: "none",
                  opacity: 0,
                  animation: anim,
                  transform: "translate(-50%, -50%)",
                }}
              >
                ✦
              </span>
            ) : (
              <div
                style={{
                  position: "absolute",
                  width: p.size,
                  height: p.size,
                  borderRadius: "50%",
                  background: p.color,
                  boxShadow: `0 0 ${p.size * 3}px ${p.color}cc`,
                  opacity: 0,
                  animation: anim,
                  transform: "translate(-50%, -50%)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Effect 1 — Stardust Trail (CSS-generated particle bursts)
//
// Five particle kinds: glitter (1-2px), dot (3-6px), large-dot (7-10px),
// star (✦ char), glow (12-18px soft blob).
// Modes: sweep-right, sweep-left, orbit, double-right, double-left.
// "double" fires two parallel horizontal bands in a single burst.
// ─────────────────────────────────────────────────────────────────────────────

const TRAIL_COUNT = 50;
const SWEEP_MS    = 2800;
const ORBIT_MS    = 3200;

type ParticleKind = "glitter" | "dot" | "large-dot" | "star" | "glow";

interface StarParticle {
  xPct:  number;
  xPx:   number;
  yPx:   number;
  y:     number;
  size:  number;
  delay: number;
  dur:   number;
  kind:  ParticleKind;
}

function pickKind(i: number): ParticleKind {
  if (i % 7 === 0) return "glow";
  if (i % 4 === 0) return "star";
  if (i % 6 === 0) return "large-dot";
  if (i % 3 === 0) return "glitter";
  return "dot";
}

function sizeFor(kind: ParticleKind): number {
  switch (kind) {
    case "glitter":   return randFloat(1, 2.2);
    case "dot":       return rand(3, 6);
    case "large-dot": return rand(7, 10);
    case "star":      return rand(4, 8);
    case "glow":      return rand(13, 18);
  }
}

function buildSweep(dir: "right" | "left", delayOffset = 0): StarParticle[] {
  return Array.from({ length: TRAIL_COUNT }, (_, i) => {
    const t    = i / (TRAIL_COUNT - 1);
    const xPct = dir === "right" ? t * 100 : (1 - t) * 100;
    const kind = pickKind(i);
    return {
      xPct, xPx: 0, yPx: 0,
      y:     rand(-32, 32),
      size:  sizeFor(kind),
      delay: delayOffset + t * SWEEP_MS + rand(-60, 60),
      dur:   rand(550, 1100),
      kind,
    };
  });
}

function buildOrbit(): StarParticle[] {
  const N = 24, rx = 230, ry = 88;
  return Array.from({ length: N }, (_, i) => {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
    const kind = pickKind(i);
    return {
      xPct: 50,
      xPx: rx * Math.cos(angle),
      yPx: ry * Math.sin(angle),
      y: 0,
      size:  sizeFor(kind),
      delay: (i / N) * ORBIT_MS + rand(-40, 40),
      dur:   rand(650, 1050),
      kind,
    };
  });
}

const SWEEP_TOPS = ["4%", "8%", "14%", "20%", "6%", "11%"];

function StarParticleEl({ p }: { p: StarParticle }) {
  const anim = `cover-particle-twinkle ${p.dur}ms ease-in-out ${p.delay}ms both`;

  switch (p.kind) {
    case "glitter":
      return (
        <div
          style={{
            position: "absolute",
            width: p.size, height: p.size,
            borderRadius: "50%",
            background: "#fffde8",
            boxShadow: `0 0 ${p.size * 3}px rgba(255,220,80,1), 0 0 ${p.size * 6}px rgba(255,200,50,0.7)`,
            opacity: 0,
            animation: anim,
            transform: "translate(-50%, -50%)",
          }}
        />
      );
    case "dot":
      return (
        <div
          style={{
            position: "absolute",
            width: p.size, height: p.size,
            borderRadius: "50%",
            background: "radial-gradient(circle, #fffde0 0%, #ffd84d 55%, rgba(255,160,0,0.1) 100%)",
            boxShadow: `0 0 ${p.size * 2}px rgba(255,214,79,1), 0 0 ${p.size * 4.5}px rgba(255,240,150,0.7)`,
            opacity: 0,
            animation: anim,
            transform: "translate(-50%, -50%)",
          }}
        />
      );
    case "large-dot":
      return (
        <div
          style={{
            position: "absolute",
            width: p.size, height: p.size,
            borderRadius: "50%",
            background: "radial-gradient(circle, #ffffff 0%, #fffde0 30%, #ffd84d 65%, rgba(255,140,0,0.08) 100%)",
            boxShadow: `0 0 ${p.size}px rgba(255,253,224,0.9), 0 0 ${p.size * 2.5}px rgba(255,214,79,0.95), 0 0 ${p.size * 5}px rgba(255,200,50,0.6)`,
            opacity: 0,
            animation: anim,
            transform: "translate(-50%, -50%)",
          }}
        />
      );
    case "star": {
      const glow = `drop-shadow(0 0 ${p.size}px rgba(255,220,80,1)) drop-shadow(0 0 ${p.size * 2.5}px rgba(255,240,150,0.8))`;
      const STAR_CHARS = ["✦", "✧", "⋆", "✦", "✦"];
      return (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            fontSize: p.size * 2.8,
            lineHeight: 1,
            color: "#ffd84d",
            filter: glow,
            userSelect: "none",
            opacity: 0,
            animation: anim,
            transform: "translate(-50%, -50%)",
          }}
        >
          {STAR_CHARS[rand(0, STAR_CHARS.length - 1)]}
        </span>
      );
    }
    case "glow":
      return (
        <div
          style={{
            position: "absolute",
            width: p.size, height: p.size,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,230,0.98) 0%, rgba(255,228,80,0.75) 35%, rgba(255,170,0,0) 100%)",
            boxShadow: `0 0 ${p.size}px ${Math.round(p.size * 0.7)}px rgba(255,214,79,0.9), 0 0 ${p.size * 3.5}px rgba(255,240,130,0.6), 0 0 ${p.size * 6}px rgba(255,200,50,0.3)`,
            opacity: 0,
            animation: anim,
            transform: "translate(-50%, -50%)",
          }}
        />
      );
  }
}

type TrailMode = "sweep-right" | "sweep-left" | "orbit" | "double-right" | "double-left";
const TRAIL_MODES: TrailMode[] = [
  "sweep-right",  "sweep-right",  "sweep-right",
  "sweep-left",   "sweep-left",
  "orbit",
  "double-right", "double-left",
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
          ? ORBIT_MS + 1400
          : SWEEP_MS  + 1600;

        t2 = setTimeout(() => {
          if (!mountedRef.current) return;
          setActive(false);
          schedule();
        }, visFor);
      }, rand(3500, 7000));
    }

    schedule();
    return () => {
      mountedRef.current = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const particles = useMemo(() => {
    if (mode === "orbit")        return { a: buildOrbit(),          b: null };
    if (mode === "sweep-left")   return { a: buildSweep("left"),    b: null };
    if (mode === "double-right") return { a: buildSweep("right", 0), b: buildSweep("right", rand(120, 280)) };
    if (mode === "double-left")  return { a: buildSweep("left", 0),  b: buildSweep("left",  rand(120, 280)) };
    return { a: buildSweep("right"), b: null };
  }, [runKey, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null;

  if (mode === "orbit") {
    return (
      <div
        aria-hidden="true"
        className="absolute pointer-events-none select-none"
        style={{ top: "34%", left: "50%", width: 0, height: 0, zIndex: 8 }}
      >
        {particles.a.map((p, i) => (
          <div key={i} style={{ position: "absolute", left: p.xPx, top: p.yPx }}>
            <StarParticleEl p={p} />
          </div>
        ))}
      </div>
    );
  }

  const top2 = SWEEP_TOPS[(topIdx + 3) % SWEEP_TOPS.length];

  return (
    <>
      <div
        aria-hidden="true"
        className="absolute pointer-events-none select-none"
        style={{ top: SWEEP_TOPS[topIdx], left: 0, right: 0, height: "90px", zIndex: 8, overflow: "visible" }}
      >
        {particles.a.map((p, i) => (
          <div key={i} style={{ position: "absolute", left: `${p.xPct}%`, top: `calc(50% + ${p.y}px)` }}>
            <StarParticleEl p={p} />
          </div>
        ))}
      </div>
      {particles.b && (
        <div
          aria-hidden="true"
          className="absolute pointer-events-none select-none"
          style={{ top: top2, left: 0, right: 0, height: "90px", zIndex: 8, overflow: "visible" }}
        >
          {particles.b.map((p, i) => (
            <div key={i} style={{ position: "absolute", left: `${p.xPct}%`, top: `calc(50% + ${p.y}px)` }}>
              <StarParticleEl p={p} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Effect 2 — Silhouette Peek
// ─────────────────────────────────────────────────────────────────────────────

const SILHOUETTE_ZONES = [
  { top: "3%",  left: "0%",      right: undefined  },
  { top: "3%",  left: undefined, right: "0%"       },
  { top: "20%", left: "0%",      right: undefined  },
  { top: "20%", left: undefined, right: "0%"       },
  { top: "38%", left: "0%",      right: undefined  },
  { top: "38%", left: undefined, right: "0%"       },
  { top: "55%", left: "0%",      right: undefined  },
  { top: "55%", left: undefined, right: "0%"       },
] as const;

type SilhouettePhase = "hidden" | "showing" | "hiding";

function CoverSilhouettePeek() {
  const [phase,     setPhase]     = useState<SilhouettePhase>("hidden");
  const [useShadow, setUseShadow] = useState(true);
  const [zoneIdx,   setZoneIdx]   = useState(0);
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
        }, rand(4500, 7500));
      }, rand(6000, 12000));
    }

    schedule();
    return () => {
      mountedRef.current = false;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const zone        = SILHOUETTE_ZONES[zoneIdx];
  const imgSrc      = useShadow
    ? "/cover-effects/pineapple-baby-soft-shadow.png"
    : "/cover-effects/pineapple-baby-silhouette.png";
  const peakOpacity = useShadow ? 0.23 : 0.19;

  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none select-none"
      style={{
        top:   zone.top,
        left:  zone.left,
        right: zone.right,
        zIndex: 2,
        width: "clamp(120px, 22vw, 260px)",
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
// All crease PNGs have near-white (#ffffff) backgrounds after pre-processing.
// mix-blend-mode: multiply makes white areas fully transparent: white × page = page.
// Content (amber crease lines, black eyes) composites naturally via multiply.
//
// CRITICAL: no opacity on the container element. opacity < 1 creates a CSS
// compositing isolation layer — child blend modes then blend against the
// isolated transparent layer instead of the real page background, producing
// a visible rectangular artifact. Individual image opacities drive entry/exit fades.
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
      }, rand(20000, 35000));
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

  const pos       = CREASE_POS[posIdx];
  const objectPos = pos.side === "right" ? "top right" : "top left";

  const smallOpacity     = phase === "small"      ? 1 : 0;
  const smallEyesOpacity = phase === "small-eyes"  ? 1 : 0;
  const openEyesOpacity  = phase === "open-eyes"   ? 1 : 0;

  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none select-none"
      style={{
        top:    pos.top,
        left:   pos.side === "left"  ? 0 : undefined,
        right:  pos.side === "right" ? 0 : undefined,
        zIndex: 20,
        width:  "clamp(220px, 30vw, 340px)",
        // No opacity on container — see comment above
      }}
    >
      <div style={{ position: "relative" }}>
        {/* All crease PNGs now have pure-white backgrounds after pre-processing.
            multiply blend: white × page = page (transparent). Content composites naturally. */}
        <img
          src="/cover-effects/page-crease-small.png"
          alt=""
          loading="lazy"
          style={{
            width: "100%", height: "auto", display: "block",
            mixBlendMode: "multiply",
            opacity:    smallOpacity,
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
            mixBlendMode: "multiply",
            opacity:    smallEyesOpacity,
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
            mixBlendMode: "multiply",
            opacity:    openEyesOpacity,
            transition: "opacity 0.6s ease-in-out",
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CoverMagicEffects() {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return null;

  return (
    <>
      <CoverAmbientShimmer />
      <CoverStardustTrail />
      <CoverSilhouettePeek />
      <CoverCreasePeek />
    </>
  );
}
