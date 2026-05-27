"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, OrbitControls, Stage } from "@react-three/drei";
import type { Group } from "three";

// ─── Internal model scene ─────────────────────────────────────────────────────

function ModelScene({
  modelUrl,
  autoRotate,
}: {
  modelUrl: string;
  autoRotate: boolean;
}) {
  const { scene } = useGLTF(modelUrl);
  const groupRef = useRef<Group>(null);

  return (
    <>
      <Stage
        environment="city"
        intensity={0.6}
        adjustCamera={1.2}
        shadows={false}
      >
        <primitive ref={groupRef} object={scene} />
      </Stage>
      <OrbitControls
        autoRotate={autoRotate}
        autoRotateSpeed={1.4}
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(3 * Math.PI) / 4}
        makeDefault
      />
    </>
  );
}

// ─── Loading fallback ─────────────────────────────────────────────────────────

function ModelLoadingFallback({ posterUrl }: { posterUrl?: string }) {
  if (posterUrl?.startsWith("https://")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={posterUrl}
        alt="Pineapple Baby"
        className="w-full h-full object-contain object-bottom"
      />
    );
  }
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2 opacity-50">
        <span className="text-5xl animate-pulse select-none" aria-hidden="true">🍍</span>
        <span className="text-xs font-semibold text-tiki-brown/50">Loading…</span>
      </div>
    </div>
  );
}

// ─── Error fallback ───────────────────────────────────────────────────────────

function ModelErrorFallback({
  fallbackImageUrl,
}: {
  fallbackImageUrl?: string;
}) {
  if (fallbackImageUrl?.startsWith("https://")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={fallbackImageUrl}
        alt="Pineapple Baby"
        className="w-full h-full object-contain object-bottom"
      />
    );
  }
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
      <span className="text-6xl select-none" aria-hidden="true">🍍</span>
      <p className="text-xs text-tiki-brown/50 font-semibold text-center leading-snug">
        Pineapple Baby 3D preview is coming soon.
      </p>
    </div>
  );
}

// ─── Canvas error boundary wrapper ───────────────────────────────────────────

function CanvasWithModel({
  modelUrl,
  posterUrl,
  fallbackImageUrl,
  autoRotate,
}: {
  modelUrl: string;
  posterUrl?: string;
  fallbackImageUrl?: string;
  autoRotate: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <ModelErrorFallback fallbackImageUrl={fallbackImageUrl} />;
  }

  return (
    <Suspense fallback={<ModelLoadingFallback posterUrl={posterUrl} />}>
      <ErrorBoundaryCanvas
        modelUrl={modelUrl}
        posterUrl={posterUrl}
        fallbackImageUrl={fallbackImageUrl}
        autoRotate={autoRotate}
        onError={() => setFailed(true)}
      />
    </Suspense>
  );
}

function ErrorBoundaryCanvas({
  modelUrl,
  posterUrl,
  fallbackImageUrl,
  autoRotate,
  onError,
}: {
  modelUrl: string;
  posterUrl?: string;
  fallbackImageUrl?: string;
  autoRotate: boolean;
  onError: () => void;
}) {
  try {
    return (
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: "transparent" }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", () => onError(), {
            once: true,
          });
        }}
      >
        <Suspense fallback={null}>
          <ModelScene modelUrl={modelUrl} autoRotate={autoRotate} />
        </Suspense>
      </Canvas>
    );
  } catch {
    onError();
    return <ModelErrorFallback fallbackImageUrl={fallbackImageUrl} />;
  }
}

// ─── Public component ─────────────────────────────────────────────────────────

export type PineappleBabyHeroModelProps = {
  modelUrl?: string;
  modelType?: "glb" | "gltf" | "none";
  posterUrl?: string;
  fallbackImageUrl?: string;
  autoRotate?: boolean;
  interactionHint?: string;
};

export default function PineappleBabyHeroModel({
  modelUrl,
  modelType = "none",
  posterUrl,
  fallbackImageUrl,
  autoRotate = true,
  interactionHint = "Drag to spin Pineapple Baby",
}: PineappleBabyHeroModelProps) {
  const hasModel =
    typeof modelUrl === "string" &&
    modelUrl.startsWith("https://") &&
    (modelType === "glb" || modelType === "gltf");

  return (
    <div className="relative w-full h-full flex flex-col items-center">
      <div className="relative w-full flex-1">
        {hasModel ? (
          <CanvasWithModel
            modelUrl={modelUrl}
            posterUrl={posterUrl}
            fallbackImageUrl={fallbackImageUrl}
            autoRotate={autoRotate}
          />
        ) : (
          <ModelErrorFallback fallbackImageUrl={fallbackImageUrl} />
        )}
      </div>

      {hasModel && interactionHint && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 pointer-events-none select-none">
          <span className="text-[10px] font-bold text-tiki-brown/35 bg-white/50 backdrop-blur-sm px-2.5 py-1 rounded-full whitespace-nowrap">
            ↺ {interactionHint}
          </span>
        </div>
      )}
    </div>
  );
}
