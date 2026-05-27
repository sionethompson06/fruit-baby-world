"use client";

import dynamic from "next/dynamic";
import type { PineappleBabyHeroModelProps } from "./PineappleBabyHeroModel";

// Load the 3D viewer only on client, ssr:false prevents WebGL crashes during SSR
const PineappleBabyHeroModel = dynamic(() => import("./PineappleBabyHeroModel"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-end justify-center pb-6">
      <span className="text-9xl select-none animate-pulse" aria-hidden="true">🍍</span>
    </div>
  ),
});

export default function PineappleBabyHeroModelLoader(
  props: PineappleBabyHeroModelProps
) {
  return <PineappleBabyHeroModel {...props} />;
}
