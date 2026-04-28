import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Canon Protection Center | Story Studio",
};

const mustPreserve = [
  "Body shape, silhouette, and proportions",
  "Eye style, mouth style, and blush/cheek details",
  "Fruit body texture and natural color palette",
  "Leaf, crown, and signature accessory shapes",
  "Cute baby-like design language and scale",
  "Brand color palettes as defined in canonical JSON",
  "Signature visual features specific to each character",
];

const mayGenerate = [
  "New poses and expressive character moments",
  "New scene compositions for episodes and stories",
  "Promotional and episode artwork in varied settings",
  "Animation and story frame variations",
  "Seasonal or thematic costume additions (non-destructive)",
  "Background environments and scene staging",
];

const mustNever = [
  "Redesign characters or alter their fruit identity",
  "Change defining colors or remove signature features",
  "Make characters older, realistic, scarier, sharper, or off-brand",
  'Create loose "inspired by" versions that drift from official references',
  "Remove leaf crowns, accessories, or character-specific markings",
  "Alter the cute baby-like proportion and design language",
  "Publish any generated variation without human approval",
  "Allow public users to freely generate character variations",
];

const approvalSteps = [
  { step: 1, label: "Generate using official reference image as anchor", emoji: "📎" },
  { step: 2, label: "Review output for character fidelity", emoji: "🔍" },
  { step: 3, label: "Compare to canonical profile image side by side", emoji: "🖼️" },
  { step: 4, label: "Human approval before saving", emoji: "✅" },
  { step: 5, label: "Save to repo only after approval", emoji: "💾" },
  { step: 6, label: "Publish only from approved saved assets", emoji: "🚀" },
];

export default function CanonPage() {
  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">
      <section className="bg-gradient-to-b from-warm-coral/15 via-bg-cream to-bg-cream py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-warm-coral/30 text-tiki-brown uppercase tracking-widest">
              Reference
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Admin Only
            </span>
          </div>
          <div className="text-4xl mb-3">🔒</div>
          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
            Canon Protection Center
          </h1>
          <p className="text-tiki-brown/70 text-base leading-relaxed max-w-2xl">
            Official character profile images and canonical JSON files are the
            source of truth for all Fruit Baby World content. Future AI
            generation must be reference-anchored. All generated assets require
            human approval before publishing.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col gap-8">

        {/* Core rule callout */}
        <div className="flex items-start gap-3 bg-white border border-warm-coral/30 rounded-2xl px-5 py-4 shadow-sm">
          <span className="text-xl flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-bold text-tiki-brown mb-0.5">
              Trademark and character fidelity requirement
            </p>
            <p className="text-sm text-tiki-brown/65 leading-relaxed">
              Fruit Baby World characters are official trademarked intellectual
              property. Any generated, modified, or derivative character
              artwork must remain exactly to very close to the official
              canonical references at all times.
            </p>
          </div>
        </div>

        {/* Three-panel rules */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl border border-tropical-green/30 shadow-sm p-6">
            <h2 className="text-sm font-black text-tiki-brown mb-4 flex items-center gap-2">
              <span>✅</span> AI Must Preserve
            </h2>
            <ul className="space-y-2.5">
              {mustPreserve.map((rule) => (
                <li
                  key={rule}
                  className="flex items-start gap-2 text-xs text-tiki-brown/70 leading-snug"
                >
                  <span className="text-tropical-green flex-shrink-0 mt-0.5">•</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-3xl border border-pineapple-yellow/40 shadow-sm p-6">
            <h2 className="text-sm font-black text-tiki-brown mb-4 flex items-center gap-2">
              <span>🎨</span> AI May Generate
            </h2>
            <ul className="space-y-2.5">
              {mayGenerate.map((rule) => (
                <li
                  key={rule}
                  className="flex items-start gap-2 text-xs text-tiki-brown/70 leading-snug"
                >
                  <span className="text-pineapple-yellow flex-shrink-0 mt-0.5">•</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-3xl border border-warm-coral/30 shadow-sm p-6">
            <h2 className="text-sm font-black text-tiki-brown mb-4 flex items-center gap-2">
              <span>🚫</span> AI Must Never
            </h2>
            <ul className="space-y-2.5">
              {mustNever.map((rule) => (
                <li
                  key={rule}
                  className="flex items-start gap-2 text-xs text-tiki-brown/70 leading-snug"
                >
                  <span className="text-warm-coral flex-shrink-0 mt-0.5">•</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Approval workflow */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-7">
          <h2 className="text-base font-black text-tiki-brown mb-5">
            Required approval workflow for all generated assets
          </h2>
          <div className="flex flex-col gap-3">
            {approvalSteps.map((s) => (
              <div key={s.step} className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-ube-purple/15 text-ube-purple text-xs font-black flex items-center justify-center flex-shrink-0">
                  {s.step}
                </span>
                <span className="text-lg flex-shrink-0">{s.emoji}</span>
                <span className="text-sm text-tiki-brown/75">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Source of truth */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-7">
          <h2 className="text-base font-black text-tiki-brown mb-4">
            Canonical sources of truth
          </h2>
          <ul className="space-y-3">
            {[
              "Official character profile PNG images in public/characters/",
              "Canonical character JSON files in src/content/characters/",
              "Official character profile documents (external)",
              "Approved uploaded character reference images",
              "Canonical episode JSON files in src/content/episodes/",
              "Canonical product JSON files in src/content/products/",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-tiki-brown/75 leading-snug"
              >
                <span className="text-ube-purple mt-0.5 flex-shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

      </section>
    </div>
  );
}
