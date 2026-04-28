import type { Metadata } from "next";
import { getAllProducts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Product & Merch Planner | Story Studio",
};

export default function AdminProductsPage() {
  const products = getAllProducts();

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">
      <section className="bg-gradient-to-b from-tropical-green/15 via-bg-cream to-bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-blue/50 text-tiki-brown uppercase tracking-widest">
              Planned
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Admin Only
            </span>
          </div>
          <div className="text-4xl mb-3">🛍️</div>
          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
            Product &amp; Merch Planner
          </h1>
          <p className="text-tiki-brown/70 text-base leading-relaxed max-w-xl">
            Plan plushies, squishes, collectibles, sticker packs, storybooks,
            apparel, and bundles tied to characters and story moments.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col gap-6">

        {/* Live count */}
        <div className="bg-white rounded-2xl border border-tiki-brown/10 shadow-sm px-6 py-5 flex items-center gap-4">
          <span className="text-3xl">🎁</span>
          <div>
            <p className="text-2xl font-black text-tiki-brown">{products.length}</p>
            <p className="text-xs font-semibold text-tiki-brown/50">
              product concepts in canonical JSON
            </p>
          </div>
        </div>

        {/* Not active notice */}
        <div className="flex items-start gap-3 bg-white border border-pineapple-yellow/40 rounded-2xl px-5 py-4 shadow-sm">
          <span className="text-xl flex-shrink-0">🏗️</span>
          <div>
            <p className="text-sm font-bold text-tiki-brown mb-0.5">
              Read-only planning shell
            </p>
            <p className="text-sm text-tiki-brown/65 leading-relaxed">
              Merch planning and product editing will be built in a future
              phase. Product data is managed via canonical JSON files. No
              editing is available here.
            </p>
          </div>
        </div>

        {/* Product list — read-only */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-7">
          <h2 className="text-base font-black text-tiki-brown mb-4">
            Current product concepts
          </h2>
          <div className="flex flex-col divide-y divide-tiki-brown/8">
            {products.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between py-3 gap-3"
              >
                <div>
                  <p className="text-sm font-bold text-tiki-brown">{p.name}</p>
                  <p className="text-xs text-tiki-brown/50 capitalize">
                    {p.category}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 bg-pineapple-yellow/40 text-tiki-brown capitalize">
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* What it will do */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-7">
          <h2 className="text-base font-black text-tiki-brown mb-4">
            What this will do later
          </h2>
          <ul className="space-y-3">
            {[
              "Create and manage product concepts linked to characters and episode tie-ins",
              "Track design status from concept → design → approved → available",
              "Generate promotional image prompts for merchandise",
              "Plan product collections and bundles",
              "Prepare product listings for the public shop page",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-tiki-brown/75 leading-snug"
              >
                <span className="text-tropical-green mt-0.5 flex-shrink-0">
                  •
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

      </section>
    </div>
  );
}
