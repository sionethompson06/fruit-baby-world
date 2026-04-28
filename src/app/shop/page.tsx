import type { Metadata } from "next";
import { getAllProducts, getAllCharacters } from "@/lib/content";
import ProductCard from "@/components/ProductCard";

export const metadata: Metadata = {
  title: "Fruit Baby Shop | Fruit Baby World",
  description:
    "Plushies, collectibles, stickers, and more featuring all your favorite Fruit Baby friends.",
};

export default function ShopPage() {
  const products = getAllProducts();
  const characters = getAllCharacters();
  const characterMap = Object.fromEntries(characters.map((c) => [c.id, c]));

  const gridClass =
    products.length === 1
      ? "max-w-md w-full mx-auto"
      : products.length === 2
      ? "grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";

  return (
    <div className="flex flex-col">

      {/* Hero */}
      <section className="bg-gradient-to-b from-ube-purple/15 via-bg-cream to-bg-cream py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-4" role="img" aria-label="shop">🛍️</div>
          <h1 className="text-4xl sm:text-5xl font-black text-tiki-brown mb-4 leading-tight">
            Fruit Baby Shop
          </h1>
          <p className="text-tiki-brown/70 text-lg leading-relaxed">
            Plushies, collectibles, stickers, and more — bring your favorite
            Fruit Baby friends home.
          </p>
        </div>
      </section>

      {/* Info banner */}
      <section className="bg-coconut-cream border-y border-pineapple-yellow/30 py-4 px-4 text-center">
        <p className="text-sm font-semibold text-tiki-brown/70 max-w-xl mx-auto">
          🎨 All products are currently in the concept stage — designs are in
          progress and will launch soon.
        </p>
      </section>

      {/* Product gallery */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-14">
        {products.length > 0 ? (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-black text-tiki-brown mb-1">
                🎁 Products
              </h2>
              <p className="text-sm text-tiki-brown/60">
                {products.length}{" "}
                {products.length === 1 ? "product" : "products"} — more on the
                way
              </p>
            </div>

            <div className={gridClass}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  characterMap={characterMap}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🛍️</p>
            <p className="font-semibold text-tiki-brown/50">
              No products yet — check back soon!
            </p>
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6">
        <div className="border-t-2 border-dashed border-tiki-brown/15" />
      </div>

      {/* Shop Studio Coming Soon */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-14">
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm px-6 sm:px-10 py-10 text-center flex flex-col items-center gap-4">
          <div className="text-4xl" role="img" aria-label="merch studio">🎨✨</div>
          <h2 className="text-xl font-black text-tiki-brown">
            Merch Studio Coming Soon
          </h2>
          <p className="text-sm text-tiki-brown/60 leading-relaxed max-w-md">
            The Fruit Baby Merch Studio will let the team design product
            concepts, generate mockups, plan collections, and build out complete
            merchandise lines — all in one place.
          </p>
        </div>
      </section>

    </div>
  );
}
