import type { Metadata } from "next";
import Link from "next/link";
import { getAllProductConcepts } from "@/lib/productConcepts";
import { getShopCollectablesConfig } from "@/lib/shopCollectables";
import ProductConceptManagerSection from "./ProductConceptManagerSection";
import ProductPromptBuilderSection from "./ProductPromptBuilderSection";
import ShopCollectablesManager from "./ShopCollectablesManager";

export const metadata: Metadata = {
  title: "Products | Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminProductsPage() {
  const concepts = getAllProductConcepts();
  const collectablesConfig = getShopCollectablesConfig();

  return (
    <main className="min-h-screen bg-gradient-to-b from-tropical-green/8 to-white">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-20 flex flex-col gap-8">
        <div className="flex items-center gap-2 text-sm text-tiki-brown/50">
          <Link href="/admin" className="hover:text-tiki-brown transition-colors">Admin</Link>
          <span>/</span>
          <span className="text-tiki-brown font-semibold">Products</span>
        </div>

        <div>
          <h1 className="text-2xl font-black text-tiki-brown mb-1">🛍️ Products</h1>
          <p className="text-sm text-tiki-brown/60">
            Plan and manage product concepts and shop collectables.
          </p>
        </div>

        <ShopCollectablesManager initialConfig={collectablesConfig} productConcepts={concepts} />
        <ProductConceptManagerSection characters={[]} initialConcepts={concepts} />
        <ProductPromptBuilderSection />
      </div>
    </main>
  );
}

