import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Variation Generator | Story Studio",
};

export default function VariationsPage() {
  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">
      <section className="bg-gradient-to-b from-blush-pink/25 via-bg-cream to-bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blush-pink/40 text-tiki-brown uppercase tracking-widest">
              Future Phase
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Admin Only
            </span>
          </div>
          <div className="text-4xl mb-3">🎨</div>
          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
            Reference-Anchored Character Variation Generator
          </h1>
          <p className="text-tiki-brown/70 text-base leading-relaxed max-w-xl">
            An admin-only tool for creating character-safe visual variations
            using official uploaded references, strict prompt guardrails, and
            mandatory human approval before any output can be used or published.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col gap-6">

        {/* Hard stop notice */}
        <div className="flex items-start gap-3 bg-white border border-warm-coral/40 rounded-2xl px-5 py-4 shadow-sm">
          <span className="text-xl flex-shrink-0">🚫</span>
          <div>
            <p className="text-sm font-bold text-tiki-brown mb-0.5">
              No image generation is active
            </p>
            <p className="text-sm text-tiki-brown/65 leading-relaxed">
              This page is a planning shell only. No generation, no image
              upload, no API calls, and no AI tools are active on this page.
              The variation generator will be built in a future phase.
            </p>
          </div>
        </div>

        {/* Access rules */}
        <div className="bg-white rounded-3xl border border-warm-coral/25 shadow-sm p-7">
          <h2 className="text-base font-black text-tiki-brown mb-4 flex items-center gap-2">
            <span>🔒</span> Access &amp; Safety Requirements
          </h2>
          <ul className="space-y-3">
            {[
              "Public users must not be able to freely generate character variations.",
              "This tool will be admin-only. No public access will be provided.",
              "All generation must use official uploaded character reference images as anchors.",
              "Generated variations must preserve character identity exactly to very close to the official profile images.",
              "Every generated variation must go through human review and approval before being saved or published.",
              "No generated asset may appear on the public website without an explicit approval step.",
              "Generated outputs that fail to match the official character references must be discarded.",
            ].map((rule) => (
              <li
                key={rule}
                className="flex items-start gap-2.5 text-sm text-tiki-brown/75 leading-snug"
              >
                <span className="text-warm-coral mt-0.5 flex-shrink-0">•</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>

        {/* What it will do */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-7">
          <h2 className="text-base font-black text-tiki-brown mb-4">
            What this will do later
          </h2>
          <ul className="space-y-3">
            {[
              "Accept an official character reference image as the generation anchor",
              "Apply strict prompt guardrails to preserve character identity",
              "Generate new poses, expressions, and scene compositions",
              "Display generated output alongside the reference for side-by-side comparison",
              "Route output through the approval workflow before saving",
              "Save only approved variations to the canonical repository",
              "Block any generation attempt without a valid reference image loaded",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-tiki-brown/75 leading-snug"
              >
                <span className="text-blush-pink mt-0.5 flex-shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Generation placeholder */}
        <div className="bg-white rounded-3xl border border-dashed border-tiki-brown/20 p-7 text-center">
          <p className="text-3xl mb-3">🖼️</p>
          <p className="text-sm font-semibold text-tiki-brown/50">
            Reference-anchored variation generator coming in a future phase
          </p>
          <p className="text-xs text-tiki-brown/35 mt-1">
            Admin only · Requires official reference · Human approval required
          </p>
        </div>

      </section>
    </div>
  );
}
