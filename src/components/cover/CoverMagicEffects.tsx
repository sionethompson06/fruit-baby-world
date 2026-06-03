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
// Effect 1 — Stardust Trail
// ─────────────────────────────────────────────────────────────────────────────

const TRAIL_COUNT = 30;
const SWEEP_MS    = 2600;
const ORBIT_MS    = 3000;

type ParticleKind = "dot" | "star" | "glow";

interface StarParticle {
  xPct:  number;
  xPx:   number;
  yPx:   number;
  y:     number;
  size:  number;
  delay: number;
  dur:   number;
  opk:   number;
  kind:  ParticleKind;
}

function buildSweep(dir: "right" | "left"): StarParticle[] {
  return Array.from({ length: TRAIL_COUNT }, (_, i) => {
    const t    = i / (TRAIL_COUNT - 1);
    const xPct = dir === "right" ? t * 100 : (1 - t) * 100;
    const kind: ParticleKind = i % 5 === 0 ? "star" : i % 7 === 0 ? "glow" : "dot";
    return {
      xPct, xPx: 0, yPx: 0,
      y:     rand(-28, 28),
      size:  kind === "glow" ? rand(8, 14) : rand(3, 8),
      delay: t * SWEEP_MS + rand(-80, 80),
      dur:   rand(600, 1100),
      opk:   randFloat(0.80, 1.0),
      kind,
    };
  });
}

function buildOrbit(): StarParticle[] {
  const N = 20, rx = 220, ry = 80;
  return Array.from({ length: N }, (_, i) => {
    const angle = (i / N) * Math.PI * 2 - Math.PI / 2;
    const kind: ParticleKind = i % 4 === 0 ? "star" : i % 6 === 0 ? "glow" : "dot";
    return {
      xPct: 50,
      xPx: rx * Math.cos(angle),
      yPx: ry * Math.sin(angle),
      y: 0,
      size:  kind === "glow" ? rand(8, 12) : rand(3, 7),
      delay: (i / N) * ORBIT_MS + rand(-40, 40),
      dur:   rand(700, 1100),
      opk:   randFloat(0.85, 1.0),
      kind,
    };
  });
}

const SWEEP_TOPS = ["5%", "9%", "15%", "22%", "3%"];

function StarParticleEl({ p }: { p: StarParticle }) {
  const anim = `cover-particle-twinkle ${p.dur}ms ease-in-out ${p.delay}ms both`;

  if (p.kind === "glow") {
    return (
      <div
        style={{
          position: "absolute",
          width:  p.size,
          height: p.size,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,253,224,0.95) 0%, rgba(255,220,79,0.65) 35%, rgba(255,160,0,0) 100%)",
          boxShadow: `0 0 ${p.size}px ${Math.round(p.size * 0.6)}px rgba(255,214,79,0.85), 0 0 ${p.size * 3}px rgba(255,240,130,0.55)`,
          opacity: 0,
          animation: anim,
          transform: "translate(-50%, -50%)",
        }}
      />
    );
  }

  if (p.kind === "star") {
    const glow = `drop-shadow(0 0 ${p.size}px rgba(255,214,79,0.95)) drop-shadow(0 0 ${p.size * 2.5}px rgba(255,240,150,0.70))`;
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
        ✦
      </span>
    );
  }

  // dot
  return (
    <div
      style={{
        position: "absolute",
        width:  p.size,
        height: p.size,
        borderRadius: "50%",
        background: "radial-gradient(circle, #fffde0 0%, #ffd84d 55%, rgba(255,160,0,0.12) 100%)",
        boxShadow: `0 0 ${p.size * 2}px rgba(255,214,79,0.95), 0 0 ${p.size * 4}px rgba(255,240,150,0.65)`,
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
      }, rand(4000, 8000));
    }

    schedule();
    return () => {
      mountedRef.current = false;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const particles = useMemo(() => {
    if (mode === "orbit")      return buildOrbit();
    if (mode === "sweep-left") return buildSweep("left");
    return buildSweep("right");
  }, [runKey, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active) return null;

  if (mode === "orbit") {
    return (
      <div
        aria-hidden="true"
        className="absolute pointer-events-none select-none"
        style={{ top: "34%", left: "50%", width: 0, height: 0, zIndex: 8 }}
      >
        {particles.map((p, i) => (
          <div key={i} style={{ position: "absolute", left: p.xPx, top: p.yPx }}>
            <StarParticleEl p={p} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none select-none"
      style={{
        top:    SWEEP_TOPS[topIdx],
        left:   0,
        right:  0,
        height: "80px",
        zIndex: 8,
        overflow: "visible",
      }}
    >
      {particles.map((p, i) => (
        <div key={i} style={{ position: "absolute", left: `${p.xPct}%`, top: `calc(50% + ${p.y}px)` }}>
          <StarParticleEl p={p} />
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Effect 2 — Silhouette Peek
// ─────────────────────────────────────────────────────────────────────────────

const SILHOUETTE_ZONES = [
  { top: "3%",  left: "0%",       right: undefined  },
  { top: "3%",  left: undefined,  right: "0%"       },
  { top: "20%", left: "0%",       right: undefined  },
  { top: "20%", left: undefined,  right: "0%"       },
  { top: "38%", left: "0%",       right: undefined  },
  { top: "38%", left: undefined,  right: "0%"       },
  { top: "55%", left: "0%",       right: undefined  },
  { top: "55%", left: undefined,  right: "0%"       },
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
        }, rand(5000, 8000));
      }, rand(8000, 16000));
    }

    schedule();
    return () => {
      mountedRef.current = false;
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const zone         = SILHOUETTE_ZONES[zoneIdx];
  const imgSrc       = useShadow
    ? "/cover-effects/pineapple-baby-soft-shadow.png"
    : "/cover-effects/pineapple-baby-silhouette.png";
  const peakOpacity  = useShadow ? 0.22 : 0.18;

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
// IMPORTANT: opacity must NOT be set on the container element.
// Any opacity < 1 on a parent creates a compositing isolation layer —
// child mix-blend-mode then blends against the isolated transparent layer
// instead of the actual page, producing a visible rectangular artifact.
// Individual image opacities are used instead for entry/exit fades.
//
// Blend mode strategy (based on pixel sampling of source PNGs):
//   page-crease-small.png             — white background → multiply
//   page-crease-small-with-eyes.png   — white background → multiply
//   page-crease-open-with-eyes.png    — black background → screen
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

  const pos       = CREASE_POS[posIdx];
  const objectPos = pos.side === "right" ? "top right" : "top left";

  const smallOpacity     = phase === "small"     ? 1 : 0;
  const smallEyesOpacity = phase === "small-eyes" ? 1 : 0;
  const openEyesOpacity  = phase === "open-eyes"  ? 1 : 0;

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
        // No opacity property — see comment above
      }}
    >
      <div style={{ position: "relative" }}>
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
            mixBlendMode: "screen",
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
      <CoverStardustTrail />
      <CoverSilhouettePeek />
      <CoverCreasePeek />
    </>
  );
}
