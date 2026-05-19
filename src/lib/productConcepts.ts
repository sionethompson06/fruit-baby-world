// Product concept helpers — server-only (reads from JSON file via fs).
// Do not import in client components.

import fs from "fs";
import path from "path";
import type {
  ProductConcept,
  ProductConceptCategory,
  ProductConceptStatus,
} from "@/lib/productConceptTypes";

const PRODUCT_CONCEPTS_PATH = path.join(
  process.cwd(),
  "src/content/products/product-concepts.json"
);

function isProductConcept(v: unknown): v is ProductConcept {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.title === "string" &&
    typeof r.category === "string" &&
    typeof r.status === "string" &&
    typeof r.shortDescription === "string" &&
    typeof r.createdAt === "string"
  );
}

export function getAllProductConcepts(): ProductConcept[] {
  try {
    const raw = fs.readFileSync(PRODUCT_CONCEPTS_PATH, "utf8");
    const data = JSON.parse(raw) as { concepts?: unknown[] };
    if (!Array.isArray(data.concepts)) return [];
    return data.concepts.filter(isProductConcept);
  } catch {
    return [];
  }
}

export function getActiveProductConcepts(): ProductConcept[] {
  return getAllProductConcepts().filter((c) => c.status !== "archived");
}

export function getArchivedProductConcepts(): ProductConcept[] {
  return getAllProductConcepts().filter((c) => c.status === "archived");
}

export function getProductConceptsByCharacter(
  characterSlug: string
): ProductConcept[] {
  return getAllProductConcepts().filter((c) => c.characterSlug === characterSlug);
}

export function getProductConceptCategoryLabel(
  category: ProductConceptCategory
): string {
  const labels: Record<ProductConceptCategory, string> = {
    plush: "Plush Toy",
    "squish-toy": "Squish Toy",
    book: "Book",
    card: "Trading Card",
    sticker: "Sticker Sheet",
    poster: "Poster",
    playset: "Playset",
    apparel: "Apparel",
    "classroom-material": "Classroom Material",
    collectible: "Collectible",
    bundle: "Bundle",
    other: "Other",
  };
  return labels[category] ?? category;
}

export function getProductConceptStatusLabel(
  status: ProductConceptStatus
): string {
  const labels: Record<ProductConceptStatus, string> = {
    idea: "Idea",
    planned: "Planned",
    "in-design": "In Design",
    archived: "Archived",
  };
  return labels[status] ?? status;
}

export function buildCharacterProductConceptContext(character: {
  slug: string;
  name?: string;
}) {
  return {
    slug: character.slug,
    productConcepts: getProductConceptsByCharacter(character.slug),
  };
}
