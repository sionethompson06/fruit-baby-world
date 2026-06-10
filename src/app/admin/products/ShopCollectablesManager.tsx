"use client";

import { useRef, useState } from "react";
import type {
  ShopCollectablesConfig,
  ShopCollectablesSection,
  ShopCollectableItem,
  ShopCollectableImage,
  ShopCollectableCtaMode,
} from "@/lib/shopCollectablesTypes";
import type { ProductConcept } from "@/lib/productConceptTypes";

type UploadStatus = "idle" | "uploading" | "error";

type ItemUploadState = {
  status: UploadStatus;
  message?: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getActiveImages(item: ShopCollectableItem): ShopCollectableImage[] {
  return (item.images ?? [])
    .filter((img) => !img.isArchived && !!img.imageUrl)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function shortName(img: ShopCollectableImage): string {
  if (img.originalFilename) {
    const base = img.originalFilename.replace(/\.[^.]+$/, "");
    return base.length > 18 ? base.slice(0, 16) + "…" : base;
  }
  return "Uploaded image";
}

// ─── Small admin field helpers ────────────────────────────────────────────────

function AdminInput({
  label,
  value,
  placeholder,
  onChange,
  type = "text",
  className,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-0.5 ${className ?? ""}`}>
      <span className="text-[9px] font-black text-tiki-brown/40 uppercase tracking-wide">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="text-[11px] border border-tiki-brown/15 rounded-lg px-2 py-1.5 text-tiki-brown/75 bg-white focus:outline-none focus:border-ube-purple/40 placeholder:text-tiki-brown/20"
      />
    </label>
  );
}

function AdminTextarea({
  label,
  value,
  placeholder,
  rows,
  onChange,
  className,
}: {
  label: string;
  value: string;
  placeholder?: string;
  rows?: number;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-0.5 ${className ?? ""}`}>
      <span className="text-[9px] font-black text-tiki-brown/40 uppercase tracking-wide">{label}</span>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows ?? 2}
        onChange={(e) => onChange(e.target.value)}
        className="text-[11px] border border-tiki-brown/15 rounded-lg px-2 py-1.5 text-tiki-brown/75 bg-white focus:outline-none focus:border-ube-purple/40 placeholder:text-tiki-brown/20 resize-none"
      />
    </label>
  );
}

// ─── Gallery image tile ───────────────────────────────────────────────────────

function GalleryImageTile({
  image,
  isPrimary,
  isHover,
  isClick,
  onSetPrimary,
  onSetHover,
  onSetClick,
  onArchive,
  onAltTextChange,
}: {
  image: ShopCollectableImage;
  isPrimary: boolean;
  isHover: boolean;
  isClick: boolean;
  onSetPrimary: () => void;
  onSetHover: () => void;
  onSetClick: () => void;
  onArchive: () => void;
  onAltTextChange: (text: string) => void;
}) {
  const hasRole = isPrimary || isHover || isClick;
  const borderColor = isPrimary
    ? "#FFD84D"
    : isHover
    ? "#8E5CF7"
    : isClick
    ? "#4CAF50"
    : "rgba(92,58,30,0.12)";

  return (
    <div className="flex flex-col gap-1 flex-shrink-0 w-[84px]">
      <div
        className="w-[84px] h-[72px] rounded-xl overflow-hidden bg-tiki-brown/5 relative"
        style={{ border: `2px solid ${borderColor}`, boxShadow: hasRole ? `0 0 0 1px ${borderColor}44` : undefined }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.imageUrl}
          alt={image.altText ?? "Product image"}
          className="w-full h-full object-contain p-1"
        />
        <div className="absolute top-0.5 right-0.5 flex flex-col gap-0.5 items-end">
          {isPrimary && (
            <span className="text-[7px] font-black px-1 py-px rounded bg-pineapple-yellow text-tiki-brown leading-none">P</span>
          )}
          {isHover && (
            <span className="text-[7px] font-black px-1 py-px rounded bg-ube-purple text-white leading-none">H</span>
          )}
          {isClick && (
            <span className="text-[7px] font-black px-1 py-px rounded bg-tropical-green text-white leading-none">C</span>
          )}
        </div>
      </div>

      <p className="text-[9px] text-tiki-brown/40 truncate leading-none" title={image.originalFilename ?? image.id}>
        {image.originalFilename ?? "—"}
      </p>

      <div className="flex gap-px">
        <button type="button" onClick={onSetPrimary} title="Set as Primary Card Image"
          className={`flex-1 text-[9px] font-black py-0.5 rounded transition-colors ${isPrimary ? "bg-pineapple-yellow/60 text-tiki-brown" : "bg-tiki-brown/6 text-tiki-brown/45 hover:bg-pineapple-yellow/30"}`}>
          P
        </button>
        <button type="button" onClick={onSetHover} title="Set as Hover / Flip Image"
          className={`flex-1 text-[9px] font-black py-0.5 rounded transition-colors ${isHover ? "bg-ube-purple/35 text-ube-purple" : "bg-tiki-brown/6 text-tiki-brown/45 hover:bg-ube-purple/20"}`}>
          H
        </button>
        <button type="button" onClick={onSetClick} title="Set as Click / Large View Image"
          className={`flex-1 text-[9px] font-black py-0.5 rounded transition-colors ${isClick ? "bg-tropical-green/30 text-tropical-green" : "bg-tiki-brown/6 text-tiki-brown/45 hover:bg-tropical-green/20"}`}>
          C
        </button>
        <button type="button" onClick={onArchive} title="Archive — removes from gallery without deleting the file"
          className="flex-1 text-[9px] font-black py-0.5 rounded bg-tiki-brown/5 text-warm-coral/70 hover:bg-warm-coral/15 transition-colors">
          ✕
        </button>
      </div>

      <input
        type="text"
        value={image.altText ?? ""}
        onChange={(e) => onAltTextChange(e.target.value)}
        placeholder="Alt text…"
        title="Image alt text for accessibility"
        className="w-full text-[8px] border border-tiki-brown/15 rounded px-1 py-0.5 text-tiki-brown/55 bg-white leading-tight focus:outline-none focus:border-ube-purple/40 placeholder:text-tiki-brown/20 truncate"
      />
    </div>
  );
}

// ─── Role summary strip ────────────────────────────────────────────────────────

function RoleSummary({
  item,
  activeImages,
  onClearRole,
}: {
  item: ShopCollectableItem;
  activeImages: ShopCollectableImage[];
  onClearRole: (role: "hover" | "click") => void;
}) {
  const primaryImage = activeImages.find((img) => img.id === item.primaryImageId);
  const hoverImage = activeImages.find((img) => img.id === item.hoverImageId);
  const clickImage = activeImages.find((img) => img.id === item.clickImageId);
  const notSet = <span className="text-tiki-brown/25 italic">Not selected</span>;

  return (
    <div className="bg-tiki-brown/3 rounded-xl px-3 py-2.5 flex flex-col gap-1.5 text-[10px]">
      <p className="text-[9px] font-black text-tiki-brown/40 uppercase tracking-wide mb-0.5">Assigned Roles</p>
      <div className="flex items-center gap-1.5">
        <span className="font-black text-pineapple-yellow/90 w-12 flex-shrink-0">Primary</span>
        <span className="truncate flex-1 text-tiki-brown/65">{primaryImage ? shortName(primaryImage) : notSet}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-black text-ube-purple/70 w-12 flex-shrink-0">Hover</span>
        <span className="truncate flex-1 text-tiki-brown/65">{hoverImage ? shortName(hoverImage) : notSet}</span>
        {hoverImage && (
          <button type="button" onClick={() => onClearRole("hover")}
            className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-tiki-brown/8 text-tiki-brown/45 hover:bg-warm-coral/15 hover:text-warm-coral/70 transition-colors">
            Clear
          </button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="font-black text-tropical-green/70 w-12 flex-shrink-0">Click</span>
        <span className="truncate flex-1 text-tiki-brown/65">{clickImage ? shortName(clickImage) : notSet}</span>
        {clickImage && (
          <button type="button" onClick={() => onClearRole("click")}
            className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-tiki-brown/8 text-tiki-brown/45 hover:bg-warm-coral/15 hover:text-warm-coral/70 transition-colors">
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Product details editor ────────────────────────────────────────────────────

function ProductDetailsEditor({
  item,
  onUpdate,
}: {
  item: ShopCollectableItem;
  onUpdate: (patch: Partial<ShopCollectableItem>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ctaMode: ShopCollectableCtaMode = item.ctaMode ?? "coming-soon";
  const bulletsText = (item.detailBullets ?? []).join("\n");

  function set<K extends keyof ShopCollectableItem>(key: K, value: ShopCollectableItem[K] | undefined) {
    onUpdate({ [key]: value } as Partial<ShopCollectableItem>);
  }

  return (
    <div className="border-t border-tiki-brown/8 pt-3">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 text-[11px] font-black text-tiki-brown/50 uppercase tracking-wide hover:text-tiki-brown/70 transition-colors w-full"
      >
        <span>📝 Product Details</span>
        <span className="ml-auto text-[10px]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-2.5">
          <p className="text-[10px] text-tiki-brown/40 bg-tiki-brown/3 rounded-lg px-3 py-2 leading-snug">
            Product details appear in the public shop modal. Checkout is not active yet.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <AdminInput
              label="Display Title"
              value={item.displayTitle ?? ""}
              placeholder={item.characterName}
              onChange={(v) => set("displayTitle", v.trim() || undefined)}
            />
            <AdminInput
              label="Collection Name"
              value={item.collectionName ?? ""}
              placeholder="e.g. Harvest Series"
              onChange={(v) => set("collectionName", v.trim() || undefined)}
            />
          </div>

          <AdminInput
            label="Short Description"
            value={item.shortDescription ?? ""}
            placeholder="One-line product blurb"
            onChange={(v) => set("shortDescription", v.trim() || undefined)}
          />

          <AdminTextarea
            label="Product Description"
            value={item.productDescription ?? ""}
            placeholder="Full product description…"
            rows={3}
            onChange={(v) => set("productDescription", v.trim() || undefined)}
          />

          <AdminTextarea
            label="Detail Bullets (one per line)"
            value={bulletsText}
            placeholder={"Soft premium plush material\nApprox. 8 inches tall\nLimited harvest edition"}
            rows={3}
            onChange={(v) => {
              const bullets = v.split("\n").map((b) => b.trim()).filter(Boolean);
              set("detailBullets", bullets.length > 0 ? bullets : undefined);
            }}
          />

          <div className="grid grid-cols-2 gap-2">
            <AdminInput
              label="Material"
              value={item.material ?? ""}
              placeholder="e.g. Premium plush"
              onChange={(v) => set("material", v.trim() || undefined)}
            />
            <AdminInput
              label="Size"
              value={item.size ?? ""}
              placeholder="e.g. Approx. 8 in tall"
              onChange={(v) => set("size", v.trim() || undefined)}
            />
            <AdminInput
              label="Age Guidance"
              value={item.ageGuidance ?? ""}
              placeholder="e.g. Ages 3+"
              onChange={(v) => set("ageGuidance", v.trim() || undefined)}
            />
            <AdminInput
              label="Care Instructions"
              value={item.careInstructions ?? ""}
              placeholder="e.g. Surface wash only"
              onChange={(v) => set("careInstructions", v.trim() || undefined)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <AdminInput
              label="Price Label"
              value={item.priceLabel ?? ""}
              placeholder="Coming Soon"
              onChange={(v) => set("priceLabel", v.trim() || undefined)}
            />
            <AdminInput
              label="CTA Label"
              value={item.ctaLabel ?? ""}
              placeholder="Harvest Coming Soon"
              onChange={(v) => set("ctaLabel", v.trim() || undefined)}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 items-end">
            <label className="flex flex-col gap-0.5">
              <span className="text-[9px] font-black text-tiki-brown/40 uppercase tracking-wide">CTA Mode</span>
              <select
                value={ctaMode}
                onChange={(e) => set("ctaMode", e.target.value as ShopCollectableCtaMode)}
                className="text-[11px] border border-tiki-brown/15 rounded-lg px-2 py-1.5 text-tiki-brown/75 bg-white focus:outline-none focus:border-ube-purple/40"
              >
                <option value="coming-soon">Coming Soon (default)</option>
                <option value="notify">Notify Me</option>
                <option value="external-link">External Link</option>
                <option value="disabled">Disabled (hidden)</option>
              </select>
            </label>

            {ctaMode === "external-link" && (
              <AdminInput
                label="External URL"
                value={item.externalUrl ?? ""}
                placeholder="https://…"
                type="url"
                onChange={(v) => set("externalUrl", v.trim() || undefined)}
              />
            )}
          </div>

          {ctaMode === "notify" && (
            <AdminInput
              label="Notify Message (shown after click)"
              value={item.notifyMessage ?? ""}
              placeholder="You'll be among the first to know!"
              onChange={(v) => set("notifyMessage", v.trim() || undefined)}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Single item row ─────────────────────────────────────────────────────────

function CollectableItemRow({
  item,
  index,
  total,
  uploadState,
  onGalleryUpload,
  onSetRole,
  onClearRole,
  onArchiveImage,
  onUpdateAltText,
  onUpdateItem,
  onToggleEnabled,
  onMoveUp,
  onMoveDown,
}: {
  item: ShopCollectableItem;
  index: number;
  total: number;
  uploadState: ItemUploadState;
  onGalleryUpload: (file: File) => void;
  onSetRole: (imageId: string, role: "primary" | "hover" | "click") => void;
  onClearRole: (role: "hover" | "click") => void;
  onArchiveImage: (imageId: string) => void;
  onUpdateAltText: (imageId: string, altText: string) => void;
  onUpdateItem: (patch: Partial<ShopCollectableItem>) => void;
  onToggleEnabled: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeImages = getActiveImages(item);
  const atMax = activeImages.length >= 4;
  const isUploading = uploadState.status === "uploading";

  return (
    <div className="bg-white rounded-2xl border border-tiki-brown/15 shadow-sm p-4 flex flex-col gap-3">
      {/* ── Row header ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Order badge */}
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-tiki-brown/8 text-[10px] font-black text-tiki-brown/50 flex items-center justify-center select-none">
          {index + 1}
        </span>

        <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-tiki-brown/5 border border-tiki-brown/10 flex items-center justify-center">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={item.productScope === "category"
                ? (item.productOptionName ?? item.productType)
                : `${item.characterName ?? ""} ${item.productType}`.trim()}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-xl opacity-20">🛍️</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-black text-tiki-brown">
              {item.productScope === "category"
                ? (item.productOptionName ?? item.displayTitle ?? "Product Option")
                : (item.characterName ?? item.characterSlug ?? "Character")}
            </p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pineapple-yellow/20 text-tiki-brown/70 capitalize">
              {item.productType}
            </span>
            {item.productScope === "category" && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-blue/25 text-tiki-brown/65">Option</span>
            )}
            {!item.enabled && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/45">Hidden</span>
            )}
          </div>
          <p className="text-xs text-tiki-brown/45 font-semibold mt-0.5">{item.statusLabel}</p>
        </div>

        {/* Reorder + visibility controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            title="Move up"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold text-tiki-brown/55 bg-tiki-brown/6 hover:bg-tiki-brown/14 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            title="Move down"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold text-tiki-brown/55 bg-tiki-brown/6 hover:bg-tiki-brown/14 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onToggleEnabled}
            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-tiki-brown/6 text-tiki-brown/55 hover:bg-tiki-brown/12 transition-colors"
          >
            {item.enabled ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {/* ── Product Image Gallery ─────────────────────────────────────── */}
      <div className="border-t border-tiki-brown/8 pt-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-black text-tiki-brown/60 uppercase tracking-wide">Product Image Gallery</p>
          <span className="text-[10px] text-tiki-brown/35 font-semibold">{activeImages.length}/4</span>
        </div>

        <p className="text-[10px] text-tiki-brown/45 leading-snug">
          <span className="font-bold text-pineapple-yellow/90">Primary</span> shows on the product card.{" "}
          <span className="font-bold text-ube-purple/70">Hover</span> appears on desktop hover.{" "}
          <span className="font-bold text-tropical-green/70">Click</span> opens first in the modal.{" "}
          <span className="font-bold text-warm-coral/70">✕</span> archives without deleting.
        </p>

        <div className="flex flex-wrap gap-2 items-start">
          {activeImages.map((img) => (
            <GalleryImageTile
              key={img.id}
              image={img}
              isPrimary={item.primaryImageId === img.id}
              isHover={item.hoverImageId === img.id}
              isClick={item.clickImageId === img.id}
              onSetPrimary={() => onSetRole(img.id, "primary")}
              onSetHover={() => onSetRole(img.id, "hover")}
              onSetClick={() => onSetRole(img.id, "click")}
              onArchive={() => onArchiveImage(img.id)}
              onAltTextChange={(text) => onUpdateAltText(img.id, text)}
            />
          ))}

          {!atMax && (
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-[84px] h-[72px] rounded-xl border-2 border-dashed border-tiki-brown/20 flex items-center justify-center hover:bg-tiki-brown/4 hover:border-tiki-brown/35 transition-colors disabled:opacity-50"
              >
                {isUploading ? <span className="text-lg text-tiki-brown/30 animate-pulse">⟳</span> : <span className="text-2xl text-tiki-brown/25">+</span>}
              </button>
              <p className="text-[9px] text-tiki-brown/35 text-center leading-none">
                {isUploading ? "Uploading…" : "Add image"}
              </p>
            </div>
          )}
        </div>

        {atMax && (
          <p className="text-[10px] text-tiki-brown/40 italic">Maximum of 4 active product images reached.</p>
        )}

        {uploadState.status === "error" && (
          <p className="text-xs text-warm-coral font-semibold">{uploadState.message ?? "Upload failed."}</p>
        )}

        {activeImages.length > 0 && (
          <RoleSummary item={item} activeImages={activeImages} onClearRole={onClearRole} />
        )}
      </div>

      {/* ── Product details editor ─────────────────────────────────────── */}
      <ProductDetailsEditor item={item} onUpdate={onUpdateItem} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onGalleryUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// Convert a display title to a stable URL/file-safe slug.
function titleToProductSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

// ─── Bulk edit helpers ────────────────────────────────────────────────────────

type BulkEditForm = {
  statusLabel: string;
  collectionName: string;
  material: string;
  size: string;
  ageGuidance: string;
  careInstructions: string;
  priceLabel: string;
  ctaLabel: string;
  applyCtaMode: boolean;
  ctaMode: ShopCollectableCtaMode;
  externalUrl: string;
  notifyMessage: string;
  shortDescription: string;
  productDescription: string;
  detailBullets: string;
};

function emptyBulkForm(): BulkEditForm {
  return {
    statusLabel: "",
    collectionName: "",
    material: "",
    size: "",
    ageGuidance: "",
    careInstructions: "",
    priceLabel: "",
    ctaLabel: "",
    applyCtaMode: false,
    ctaMode: "coming-soon",
    externalUrl: "",
    notifyMessage: "",
    shortDescription: "",
    productDescription: "",
    detailBullets: "",
  };
}

function bulkFormToPatch(form: BulkEditForm): Partial<ShopCollectableItem> {
  const patch: Partial<ShopCollectableItem> = {};
  if (form.statusLabel.trim()) patch.statusLabel = form.statusLabel.trim();
  if (form.collectionName.trim()) patch.collectionName = form.collectionName.trim();
  if (form.material.trim()) patch.material = form.material.trim();
  if (form.size.trim()) patch.size = form.size.trim();
  if (form.ageGuidance.trim()) patch.ageGuidance = form.ageGuidance.trim();
  if (form.careInstructions.trim()) patch.careInstructions = form.careInstructions.trim();
  if (form.priceLabel.trim()) patch.priceLabel = form.priceLabel.trim();
  if (form.ctaLabel.trim()) patch.ctaLabel = form.ctaLabel.trim();
  if (form.applyCtaMode) patch.ctaMode = form.ctaMode;
  if (form.externalUrl.trim()) patch.externalUrl = form.externalUrl.trim();
  if (form.notifyMessage.trim()) patch.notifyMessage = form.notifyMessage.trim();
  if (form.shortDescription.trim()) patch.shortDescription = form.shortDescription.trim();
  if (form.productDescription.trim()) patch.productDescription = form.productDescription.trim();
  const bullets = form.detailBullets.split("\n").map((b) => b.trim()).filter(Boolean);
  if (bullets.length > 0) patch.detailBullets = bullets;
  return patch;
}

const BULK_FIELD_LABELS: Partial<Record<keyof ShopCollectableItem, string>> = {
  statusLabel: "Status Label",
  collectionName: "Collection Name",
  material: "Material",
  size: "Size",
  ageGuidance: "Age Guidance",
  careInstructions: "Care Instructions",
  priceLabel: "Price Label",
  ctaLabel: "CTA Label",
  ctaMode: "CTA Mode",
  externalUrl: "External URL",
  notifyMessage: "Notify Message",
  shortDescription: "Short Description",
  productDescription: "Product Description",
  detailBullets: "Detail Bullets",
};

// ─── Section panel ────────────────────────────────────────────────────────────

function sectionEmoji(productType: string): string {
  if (productType === "plushy") return "🧸";
  if (productType === "squishy") return "🫶";
  return "🛍️";
}

function CollectableSectionPanel({
  section,
  uploadStates,
  onGalleryUpload,
  onSetRole,
  onClearRole,
  onArchiveImage,
  onUpdateAltText,
  onUpdateItem,
  onToggleEnabled,
  onUpdateSection,
  onAddProductOption,
  onMoveItem,
}: {
  section: ShopCollectablesSection;
  uploadStates: Record<string, ItemUploadState>;
  onGalleryUpload: (itemId: string, file: File) => void;
  onSetRole: (itemId: string, imageId: string, role: "primary" | "hover" | "click") => void;
  onClearRole: (itemId: string, role: "hover" | "click") => void;
  onArchiveImage: (itemId: string, imageId: string) => void;
  onUpdateAltText: (itemId: string, imageId: string, altText: string) => void;
  onUpdateItem: (itemId: string, patch: Partial<ShopCollectableItem>) => void;
  onToggleEnabled: (itemId: string) => void;
  onUpdateSection: (patch: { title?: string; description?: string }) => void;
  onAddProductOption: (opt: { name: string; slug: string; description?: string }) => void;
  onMoveItem: (itemId: string, direction: "up" | "down") => void;
}) {
  const emoji = sectionEmoji(section.productType);

  // ── Section name editing ───────────────────────────────────────────────────
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameTitle, setNameTitle] = useState(section.title);
  const [nameDescription, setNameDescription] = useState(section.description);

  function openEditName() {
    setNameTitle(section.title);
    setNameDescription(section.description);
    setIsEditingName(true);
  }
  function saveEditName() {
    const t = nameTitle.trim();
    if (t) onUpdateSection({ title: t, description: nameDescription });
    setIsEditingName(false);
  }

  // ── Add Product Option ────────────────────────────────────────────────────
  const [isAddOptionOpen, setIsAddOptionOpen] = useState(false);
  const [optionName, setOptionName] = useState("");
  const [optionSlugOverride, setOptionSlugOverride] = useState("");
  const [optionDescription, setOptionDescription] = useState("");
  const derivedSlug = optionSlugOverride.trim() || titleToProductSlug(optionName);

  function submitAddOption() {
    const name = optionName.trim();
    const slug = derivedSlug;
    if (!name || !slug) return;
    onAddProductOption({ name, slug, description: optionDescription.trim() || undefined });
    setOptionName("");
    setOptionSlugOverride("");
    setOptionDescription("");
    setIsAddOptionOpen(false);
  }

  // ── Bulk edit ──────────────────────────────────────────────────────────────
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState<BulkEditForm>(emptyBulkForm);
  const [bulkConfirming, setBulkConfirming] = useState(false);

  function setBulk<K extends keyof BulkEditForm>(key: K, value: BulkEditForm[K]) {
    setBulkForm((prev) => ({ ...prev, [key]: value }));
    setBulkConfirming(false);
  }

  const bulkPatch = bulkFormToPatch(bulkForm);
  const bulkFieldNames = (Object.keys(bulkPatch) as Array<keyof ShopCollectableItem>)
    .map((k) => BULK_FIELD_LABELS[k] ?? k)
    .join(", ");
  const hasBulkChanges = Object.keys(bulkPatch).length > 0;

  function applyBulk() {
    if (!hasBulkChanges) return;
    section.items.forEach((item) => onUpdateItem(item.id, bulkPatch));
    setBulkForm(emptyBulkForm());
    setBulkConfirming(false);
    setIsBulkOpen(false);
  }

  return (
    <div className="rounded-3xl border-2 border-tiki-brown/10 overflow-hidden">
      <div className="flex flex-col gap-5 p-5">

      {/* ── Section header ─────────────────────────────────────────────── */}
      {isEditingName ? (
        <div className="bg-ube-purple/5 border border-ube-purple/20 rounded-2xl px-4 py-4 flex flex-col gap-3">
          <p className="text-xs font-black text-ube-purple/70 uppercase tracking-wide">✏️ Edit Section Name</p>

          <label className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-tiki-brown/45 uppercase tracking-wide">Display Name</span>
            <input
              type="text"
              value={nameTitle}
              onChange={(e) => setNameTitle(e.target.value)}
              placeholder="e.g. Soft Plush Mellows"
              className="text-sm border border-tiki-brown/20 rounded-xl px-3 py-2 text-tiki-brown bg-white focus:outline-none focus:border-ube-purple/40"
            />
          </label>

          <label className="flex flex-col gap-0.5">
            <span className="text-[9px] font-black text-tiki-brown/45 uppercase tracking-wide">Public Description</span>
            <input
              type="text"
              value={nameDescription}
              onChange={(e) => setNameDescription(e.target.value)}
              placeholder="Short section description shown on /shop"
              className="text-sm border border-tiki-brown/20 rounded-xl px-3 py-2 text-tiki-brown bg-white focus:outline-none focus:border-ube-purple/40"
            />
          </label>

          <div className="flex items-center gap-1.5 text-[10px] text-tiki-brown/40 bg-tiki-brown/3 rounded-xl px-3 py-2">
            <span className="font-black">Product type ID (permanent):</span>
            <code className="font-mono text-tiki-brown/55">{section.productType}</code>
            <span className="ml-1">— Display name can be changed anytime. The internal ID stays the same so images and product data remain connected.</span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveEditName}
              disabled={!nameTitle.trim()}
              className="text-xs font-bold px-4 py-1.5 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors disabled:opacity-40"
            >
              Save Name
            </button>
            <button
              type="button"
              onClick={() => setIsEditingName(false)}
              className="text-xs font-semibold px-4 py-1.5 rounded-xl bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/15 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-xl flex-shrink-0 mt-0.5">{emoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-tiki-brown">{section.title}</h3>
            {section.description && (
              <p className="text-xs text-tiki-brown/45">{section.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={openEditName}
            className="flex-shrink-0 text-[11px] font-semibold px-3 py-1 rounded-full border border-tiki-brown/15 bg-tiki-brown/4 text-tiki-brown/55 hover:bg-ube-purple/10 hover:text-ube-purple hover:border-ube-purple/20 transition-colors"
          >
            ✏️ Edit Name
          </button>
        </div>
      )}

      {/* ── Bulk edit panel ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-tiki-brown/10 bg-tiki-brown/2 overflow-hidden">
        <button
          type="button"
          onClick={() => { setIsBulkOpen((p) => !p); setBulkConfirming(false); }}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-tiki-brown/4 transition-colors"
        >
          <span className="flex items-center gap-2 text-[11px] font-black text-tiki-brown/60 uppercase tracking-wide">
            <span>🔧</span>
            <span>Apply to All Products in This Section</span>
            <span className="text-[10px] font-semibold normal-case text-tiki-brown/40">
              ({section.items.length} product{section.items.length !== 1 ? "s" : ""})
            </span>
          </span>
          <span className="text-[10px] text-tiki-brown/35">{isBulkOpen ? "▲ Close" : "▼ Open"}</span>
        </button>

        {isBulkOpen && (
          <div className="px-4 pb-4 flex flex-col gap-3 border-t border-tiki-brown/8">
            <p className="text-[10px] text-tiki-brown/50 pt-3 leading-snug">
              Set shared product details for every character in this section.
              Only non-empty fields will be applied.{" "}
              <span className="font-bold text-tiki-brown/60">Images and image role selections will not be changed.</span>
            </p>

            {/* Text fields grid */}
            <div className="grid grid-cols-2 gap-2">
              <AdminInput label="Status Label"   value={bulkForm.statusLabel}   placeholder="Harvest Coming Soon" onChange={(v) => setBulk("statusLabel", v)} />
              <AdminInput label="Collection Name" value={bulkForm.collectionName} placeholder="e.g. Harvest Series"  onChange={(v) => setBulk("collectionName", v)} />
              <AdminInput label="Material"        value={bulkForm.material}        placeholder="e.g. Ultra-soft plush" onChange={(v) => setBulk("material", v)} />
              <AdminInput label="Size"            value={bulkForm.size}            placeholder="e.g. Approx. 10 in"   onChange={(v) => setBulk("size", v)} />
              <AdminInput label="Age Guidance"    value={bulkForm.ageGuidance}     placeholder="e.g. Ages 3+"         onChange={(v) => setBulk("ageGuidance", v)} />
              <AdminInput label="Care Instructions" value={bulkForm.careInstructions} placeholder="e.g. Surface wash" onChange={(v) => setBulk("careInstructions", v)} />
              <AdminInput label="Price Label"     value={bulkForm.priceLabel}      placeholder="Coming Soon"          onChange={(v) => setBulk("priceLabel", v)} />
              <AdminInput label="CTA Label"       value={bulkForm.ctaLabel}        placeholder="Harvest Coming Soon"  onChange={(v) => setBulk("ctaLabel", v)} />
            </div>

            {/* CTA mode — select always has a value so needs explicit "apply" checkbox */}
            <div className="rounded-xl border border-tiki-brown/10 bg-white px-3 py-2.5 flex flex-col gap-1.5">
              <p className="text-[9px] font-black text-tiki-brown/40 uppercase tracking-wide">CTA Mode</p>
              <div className="flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bulkForm.applyCtaMode}
                    onChange={(e) => setBulk("applyCtaMode", e.target.checked)}
                    className="rounded accent-ube-purple"
                  />
                  <span className="text-[11px] font-semibold text-tiki-brown/65">Apply CTA Mode:</span>
                </label>
                <select
                  value={bulkForm.ctaMode}
                  onChange={(e) => { setBulk("ctaMode", e.target.value as ShopCollectableCtaMode); setBulk("applyCtaMode", true); }}
                  className="text-[11px] border border-tiki-brown/15 rounded-lg px-2 py-1 text-tiki-brown/75 bg-white focus:outline-none focus:border-ube-purple/40"
                >
                  <option value="coming-soon">Coming Soon</option>
                  <option value="notify">Notify Me</option>
                  <option value="external-link">External Link</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
              {bulkForm.applyCtaMode && bulkForm.ctaMode === "external-link" && (
                <AdminInput label="External URL" value={bulkForm.externalUrl} placeholder="https://…" type="url" onChange={(v) => setBulk("externalUrl", v)} />
              )}
              {bulkForm.applyCtaMode && bulkForm.ctaMode === "notify" && (
                <AdminInput label="Notify Message" value={bulkForm.notifyMessage} placeholder="You'll be first to know!" onChange={(v) => setBulk("notifyMessage", v)} />
              )}
            </div>

            {/* Description fields */}
            <AdminInput label="Short Description" value={bulkForm.shortDescription} placeholder="One-line product blurb" onChange={(v) => setBulk("shortDescription", v)} />
            <AdminTextarea label="Product Description" value={bulkForm.productDescription} placeholder="Full product description…" rows={2} onChange={(v) => setBulk("productDescription", v)} />
            <AdminTextarea
              label="Detail Bullets (one per line)"
              value={bulkForm.detailBullets}
              placeholder={"Soft premium plush material\nApprox. 10 inches tall\nLimited harvest edition"}
              rows={3}
              onChange={(v) => setBulk("detailBullets", v)}
            />

            {/* Confirm / Apply area */}
            {bulkConfirming ? (
              <div className="rounded-xl border border-pineapple-yellow/40 bg-pineapple-yellow/15 px-3 py-3 flex flex-col gap-2">
                <p className="text-[11px] font-black text-tiki-brown">
                  Apply to all {section.items.length} products in &ldquo;{section.title}&rdquo;?
                </p>
                {hasBulkChanges && (
                  <p className="text-[10px] text-tiki-brown/65">
                    Fields to update: {bulkFieldNames}
                  </p>
                )}
                <p className="text-[10px] text-tiki-brown/50">
                  Images and image role selections will not be changed.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={applyBulk}
                    disabled={!hasBulkChanges}
                    className="text-xs font-bold px-4 py-1.5 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors disabled:opacity-40"
                  >
                    Confirm Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkConfirming(false)}
                    className="text-xs font-semibold px-4 py-1.5 rounded-xl bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/15 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { if (hasBulkChanges) setBulkConfirming(true); }}
                disabled={!hasBulkChanges}
                className="w-full text-xs font-bold py-2.5 px-4 rounded-xl bg-ube-purple/10 border border-ube-purple/20 text-ube-purple hover:bg-ube-purple/18 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
              >
                {hasBulkChanges
                  ? `Apply Non-Empty Fields to All ${section.items.length} Products →`
                  : "Fill in fields above to bulk apply"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Add Product Option ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-tiki-brown/10 bg-tiki-brown/2 overflow-hidden">
        <button
          type="button"
          onClick={() => setIsAddOptionOpen((p) => !p)}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-tiki-brown/4 transition-colors"
        >
          <span className="flex items-center gap-2 text-[11px] font-black text-tiki-brown/60 uppercase tracking-wide">
            <span>➕</span>
            <span>Add Product Option</span>
            <span className="text-[10px] font-semibold normal-case text-tiki-brown/40">
              e.g. Mystery Box, Bundle Pack
            </span>
          </span>
          <span className="text-[10px] text-tiki-brown/35">{isAddOptionOpen ? "▲ Close" : "▼ Open"}</span>
        </button>

        {isAddOptionOpen && (
          <div className="px-4 pb-4 flex flex-col gap-3 border-t border-tiki-brown/8">
            <p className="text-[10px] text-tiki-brown/50 pt-3 leading-snug">
              Add a non-character product option to this section — such as a Mystery Box or Bundle.
              It will appear in the public shop like a regular product card.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <AdminInput
                label="Option Name *"
                value={optionName}
                placeholder="e.g. Mystery Box"
                onChange={(v) => { setOptionName(v); setOptionSlugOverride(""); }}
                className="col-span-2"
              />
              <AdminInput
                label="Slug (auto)"
                value={optionSlugOverride || derivedSlug}
                placeholder={derivedSlug || "mystery-box"}
                onChange={setOptionSlugOverride}
              />
              <AdminInput
                label="Short Description"
                value={optionDescription}
                placeholder="What's inside is a surprise!"
                onChange={setOptionDescription}
              />
            </div>
            {derivedSlug && (
              <p className="text-[10px] text-tiki-brown/35 font-mono">
                ID will be: <span className="text-tiki-brown/55">{section.productType}::option::{derivedSlug}</span>
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submitAddOption}
                disabled={!optionName.trim() || !derivedSlug}
                className="text-xs font-bold px-4 py-1.5 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors disabled:opacity-40"
              >
                Add Option
              </button>
              <button
                type="button"
                onClick={() => { setIsAddOptionOpen(false); setOptionName(""); setOptionSlugOverride(""); setOptionDescription(""); }}
                className="text-xs font-semibold px-4 py-1.5 rounded-xl bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/15 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Item rows ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <p className="text-[10px] font-black text-tiki-brown/35 uppercase tracking-wide px-1">
          Products — use ↑ ↓ to set shop display order
        </p>
        {section.items.map((item, idx) => (
          <CollectableItemRow
            key={item.id}
            item={item}
            index={idx}
            total={section.items.length}
            uploadState={uploadStates[item.id] ?? { status: "idle" }}
            onGalleryUpload={(file) => onGalleryUpload(item.id, file)}
            onSetRole={(imageId, role) => onSetRole(item.id, imageId, role)}
            onClearRole={(role) => onClearRole(item.id, role)}
            onArchiveImage={(imageId) => onArchiveImage(item.id, imageId)}
            onUpdateAltText={(imageId, altText) => onUpdateAltText(item.id, imageId, altText)}
            onUpdateItem={(patch) => onUpdateItem(item.id, patch)}
            onToggleEnabled={() => onToggleEnabled(item.id)}
            onMoveUp={() => onMoveItem(item.id, "up")}
            onMoveDown={() => onMoveItem(item.id, "down")}
          />
        ))}
      </div>

      </div>
    </div>
  );
}

// ─── Canonical characters for generated rows ─────────────────────────────────

const CANONICAL_CHARACTERS: Array<{ slug: string; name: string }> = [
  { slug: "pineapple-baby",   name: "Pineapple Baby" },
  { slug: "ube-baby",         name: "Ube Baby" },
  { slug: "mango-baby",       name: "Mango Baby" },
  { slug: "kiwi-baby",        name: "Kiwi Baby" },
  { slug: "coconut-baby",     name: "Coconut Baby" },
  { slug: "strawberry-baby",  name: "Strawberry Baby" },
  { slug: "dragonfruit-baby", name: "Dragon Fruit Baby" },
  { slug: "tiki",             name: "Tiki Trouble" },
];

// ─── Main manager ─────────────────────────────────────────────────────────────

export default function ShopCollectablesManager({
  initialConfig,
  productConcepts = [],
}: {
  initialConfig: ShopCollectablesConfig;
  productConcepts?: ProductConcept[];
}) {
  const [config, setConfig] = useState<ShopCollectablesConfig>(initialConfig);
  const [uploadStates, setUploadStates] = useState<Record<string, ItemUploadState>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [creatingRowsFor, setCreatingRowsFor] = useState<string | null>(null);
  const [createRowsSuccess, setCreateRowsSuccess] = useState<string>("");

  function setItemUploadState(itemId: string, patch: Partial<ItemUploadState>) {
    setUploadStates((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? { status: "idle" }), ...patch },
    }));
  }

  function updateItemInConfig(sectionId: string, itemId: string, patch: Partial<ShopCollectableItem>) {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId
          ? { ...s, items: s.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }
          : s
      ),
    }));
  }

  function findItem(itemId: string): { section: ShopCollectablesSection; item: ShopCollectableItem } | null {
    for (const section of config.sections) {
      const item = section.items.find((it) => it.id === itemId);
      if (item) return { section, item };
    }
    return null;
  }

  // Concepts that are not archived and don't yet have a matching section in config.
  const activeConcepts = productConcepts.filter((c) => c.status !== "archived");
  const pendingConcepts = activeConcepts.filter(
    (c) =>
      !config.sections.some(
        (s) => s.conceptId === c.id || s.id === titleToProductSlug(c.title)
      )
  );

  function handleCreateProductRows(concept: ProductConcept) {
    const slug = titleToProductSlug(concept.title);
    if (config.sections.some((s) => s.id === slug || s.conceptId === concept.id)) return;

    setCreatingRowsFor(concept.id);
    setCreateRowsSuccess("");

    const now = new Date().toISOString();
    const productLineName = concept.title.replace(/s$/, ""); // "Mellow Collectables" → "Mellow Collectable"
    const newSection: ShopCollectablesSection = {
      id: slug,
      title: concept.title,
      description: concept.shortDescription ?? "",
      productType: slug,
      productLineName,
      conceptId: concept.id,
      items: CANONICAL_CHARACTERS.map((char, idx) => ({
        id: `${char.slug}-${slug}`,
        characterSlug: char.slug,
        characterName: char.name,
        productType: slug,
        imageUrl: "",
        imagePathname: "",
        statusLabel: "Harvest Coming Soon",
        sortOrder: idx,
        enabled: false,
        images: [],
        displayTitle: `${char.name} ${productLineName}`,
        collectionName: concept.title,
        priceLabel: "Coming Soon",
        ctaLabel: "Harvest Coming Soon",
        ctaMode: "coming-soon",
        updatedAt: now,
      })),
    };

    setConfig((prev) => ({ ...prev, sections: [...prev.sections, newSection] }));
    setSaveStatus("idle");
    setCreatingRowsFor(null);
    setCreateRowsSuccess(
      `"${concept.title}" product rows created. Upload images in the new section below, then click Save Collectables.`
    );
  }

  function handleAddProductOption(
    sectionId: string,
    opt: { name: string; slug: string; description?: string }
  ) {
    const section = config.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const productType = section.productType;
    const itemId = `${productType}::option::${opt.slug}`;
    // Prevent duplicate slugs
    if (section.items.some((it) => it.id === itemId)) return;
    const now = new Date().toISOString();
    const newItem: ShopCollectableItem = {
      id: itemId,
      productScope: "category",
      productOptionSlug: opt.slug,
      productOptionName: opt.name,
      productOptionDescription: opt.description,
      productType,
      imageUrl: "",
      imagePathname: "",
      statusLabel: "Coming Soon",
      sortOrder: section.items.length,
      enabled: false,
      images: [],
      displayTitle: opt.name,
      priceLabel: "Coming Soon",
      ctaMode: "coming-soon",
      updatedAt: now,
    };
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, items: [...s.items, newItem] } : s
      ),
    }));
    setSaveStatus("idle");
  }

  async function handleGalleryUpload(itemId: string, file: File) {
    const found = findItem(itemId);
    if (!found) return;
    if (getActiveImages(found.item).length >= 4) return;

    setItemUploadState(itemId, { status: "uploading", message: undefined });

    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/media/upload-shop-collectable-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: base64,
          mimeType: file.type,
          originalFilename: file.name,
          productType: found.item.productType,
          ...(found.item.productScope === "category"
            ? { productScope: "category", productOptionSlug: found.item.productOptionSlug }
            : { characterSlug: found.item.characterSlug }),
        }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        image?: {
          id: string;
          imageUrl: string;
          imagePathname?: string;
          originalFilename?: string;
          sortOrder: number;
          isArchived: boolean;
          uploadedAt: string;
          updatedAt: string;
        };
        message?: string;
      };

      if (!data.ok || !data.image) {
        setItemUploadState(itemId, { status: "error", message: data.message ?? "Upload failed." });
        return;
      }

      const latest = findItem(itemId);
      const currentItem = latest?.item ?? found.item;
      const currentImages = currentItem.images ?? [];

      const newImage: ShopCollectableImage = {
        id: data.image.id,
        imageUrl: data.image.imageUrl,
        imagePathname: data.image.imagePathname,
        originalFilename: data.image.originalFilename,
        altText: currentItem.productScope === "category"
          ? `${currentItem.productOptionName ?? currentItem.productType} product image`
          : `${currentItem.characterName ?? ""} ${currentItem.productType} product image`.trim(),
        sortOrder: currentImages.length,
        isArchived: false,
        uploadedAt: data.image.uploadedAt,
        updatedAt: data.image.updatedAt,
      };

      const updatedImages = [...currentImages, newImage];
      const alreadyHasPrimary =
        !!currentItem.primaryImageId &&
        updatedImages.some((img) => img.id === currentItem.primaryImageId && !img.isArchived);

      const patch: Partial<ShopCollectableItem> = { images: updatedImages };
      if (!alreadyHasPrimary) {
        patch.primaryImageId = newImage.id;
        patch.imageUrl = newImage.imageUrl;
        patch.imagePathname = newImage.imagePathname ?? "";
      } else if (!currentItem.imageUrl) {
        patch.imageUrl = newImage.imageUrl;
        patch.imagePathname = newImage.imagePathname ?? "";
      }

      updateItemInConfig(found.section.id, itemId, patch);
      setItemUploadState(itemId, { status: "idle" });
      setSaveStatus("idle");
    } catch {
      setItemUploadState(itemId, { status: "error", message: "Network error during upload." });
    }
  }

  function handleSetRole(itemId: string, imageId: string, role: "primary" | "hover" | "click") {
    const found = findItem(itemId);
    if (!found) return;
    const patch: Partial<ShopCollectableItem> = {};
    if (role === "primary") {
      patch.primaryImageId = imageId;
      const img = (found.item.images ?? []).find((i) => i.id === imageId);
      if (img) { patch.imageUrl = img.imageUrl; patch.imagePathname = img.imagePathname ?? ""; }
    } else if (role === "hover") {
      patch.hoverImageId = imageId;
    } else if (role === "click") {
      patch.clickImageId = imageId;
    }
    updateItemInConfig(found.section.id, itemId, patch);
    setSaveStatus("idle");
  }

  function handleClearRole(itemId: string, role: "hover" | "click") {
    const found = findItem(itemId);
    if (!found) return;
    const patch: Partial<ShopCollectableItem> = role === "hover" ? { hoverImageId: undefined } : { clickImageId: undefined };
    updateItemInConfig(found.section.id, itemId, patch);
    setSaveStatus("idle");
  }

  function handleArchiveImage(itemId: string, imageId: string) {
    const found = findItem(itemId);
    if (!found) return;
    const updatedImages = (found.item.images ?? []).map((img) =>
      img.id === imageId ? { ...img, isArchived: true } : img
    );
    const patch: Partial<ShopCollectableItem> = { images: updatedImages };
    if (found.item.primaryImageId === imageId) {
      const nextActive = updatedImages.filter((img) => !img.isArchived && img.id !== imageId).sort((a, b) => a.sortOrder - b.sortOrder);
      const next = nextActive[0];
      patch.primaryImageId = next?.id;
      patch.imageUrl = next?.imageUrl ?? found.item.imageUrl;
      patch.imagePathname = next?.imagePathname ?? found.item.imagePathname;
    }
    if (found.item.hoverImageId === imageId) patch.hoverImageId = undefined;
    if (found.item.clickImageId === imageId) patch.clickImageId = undefined;
    updateItemInConfig(found.section.id, itemId, patch);
    setSaveStatus("idle");
  }

  function handleUpdateAltText(itemId: string, imageId: string, altText: string) {
    const found = findItem(itemId);
    if (!found) return;
    const updatedImages = (found.item.images ?? []).map((img) =>
      img.id === imageId ? { ...img, altText: altText || undefined } : img
    );
    updateItemInConfig(found.section.id, itemId, { images: updatedImages });
    setSaveStatus("idle");
  }

  function handleUpdateSection(sectionId: string, patch: { title?: string; description?: string }) {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? { ...s, ...patch } : s
      ),
    }));
    setSaveStatus("idle");
  }

  function handleUpdateItem(itemId: string, patch: Partial<ShopCollectableItem>) {
    const found = findItem(itemId);
    if (!found) return;
    updateItemInConfig(found.section.id, itemId, patch);
    setSaveStatus("idle");
  }

  function handleToggleEnabled(itemId: string) {
    const found = findItem(itemId);
    if (!found) return;
    updateItemInConfig(found.section.id, itemId, { enabled: !found.item.enabled });
    setSaveStatus("idle");
  }

  function handleMoveItem(sectionId: string, itemId: string, direction: "up" | "down") {
    setConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => {
        if (s.id !== sectionId) return s;
        const items = [...s.items];
        const idx = items.findIndex((it) => it.id === itemId);
        if (idx < 0) return s;
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= items.length) return s;
        const newItems = [...items];
        [newItems[idx], newItems[swapIdx]] = [newItems[swapIdx], newItems[idx]];
        // Re-number sortOrder to match array position
        return { ...s, items: newItems.map((it, i) => ({ ...it, sortOrder: i })) };
      }),
    }));
    setSaveStatus("idle");
  }

  async function handleSave() {
    setSaveStatus("saving");
    setSaveMessage("");
    try {
      const res = await fetch("/api/github/save-shop-collectables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        config?: ShopCollectablesConfig;
        message?: string;
      };
      if (!data.ok) {
        setSaveStatus("error");
        setSaveMessage(data.message ?? "Save failed.");
        return;
      }
      if (data.config) setConfig(data.config);
      setSaveStatus("saved");
      setSaveMessage("Saved to GitHub.");
      setUploadStates({});
    } catch {
      setSaveStatus("error");
      setSaveMessage("Network error while saving.");
    }
  }

  const hasUnsaved = saveStatus === "idle" && config !== initialConfig;

  return (
    <div className="flex flex-col gap-6 bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-black text-tiki-brown">🛍️ Shop Collectables</h2>
          <p className="text-xs text-tiki-brown/55 mt-0.5">
            Manage product images and details for all shop collectables. Click Save after changes.
          </p>
          <p className="text-xs text-tiki-brown/40 mt-1">
            To add a new product line: create a Product Concept below, then click &ldquo;Create Product Rows&rdquo; here to get upload-ready character slots.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {saveStatus === "saved" && <p className="text-xs text-tropical-green font-semibold">{saveMessage}</p>}
          {saveStatus === "error" && <p className="text-xs text-warm-coral font-semibold">{saveMessage}</p>}
          {hasUnsaved && <p className="text-xs text-pineapple-yellow/90 font-semibold">Unsaved changes</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="text-sm font-bold px-4 py-2 rounded-xl bg-tropical-green text-white hover:bg-tropical-green/85 transition-colors disabled:opacity-50 shadow-sm"
          >
            {saveStatus === "saving" ? "Saving…" : "Save Collectables"}
          </button>
        </div>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-tiki-brown/55 bg-tiki-brown/3 rounded-xl px-4 py-3 border border-tiki-brown/8">
        <span><span className="font-black text-pineapple-yellow/90">P</span> <span className="font-semibold">Primary</span> — shown on the product card</span>
        <span><span className="font-black text-ube-purple/70">H</span> <span className="font-semibold">Hover</span> — crossfades in on desktop hover</span>
        <span><span className="font-black text-tropical-green/70">C</span> <span className="font-semibold">Click</span> — shown first when the modal opens</span>
        <span><span className="font-black text-warm-coral/70">✕</span> <span className="font-semibold">Archive</span> — hides without deleting the file</span>
      </div>

      {/* ── New product line setup — concepts without rows ──────────────────── */}
      {pendingConcepts.length > 0 && (
        <div className="rounded-2xl border border-ube-purple/25 bg-ube-purple/5 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base">✨</span>
            <h3 className="text-sm font-black text-tiki-brown">New Product Lines Ready to Build</h3>
          </div>
          <p className="text-xs text-tiki-brown/60 leading-snug">
            These product concepts don&apos;t have upload rows yet. Click &ldquo;Create Product Rows&rdquo; to generate
            upload-ready character slots for that product line.
          </p>
          <div className="flex flex-col gap-2">
            {pendingConcepts.map((concept) => (
              <div
                key={concept.id}
                className="bg-white rounded-xl border border-tiki-brown/10 px-4 py-3 flex items-center gap-3 flex-wrap"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-tiki-brown truncate">{concept.title}</p>
                  {concept.shortDescription && (
                    <p className="text-xs text-tiki-brown/50 truncate leading-snug mt-0.5">
                      {concept.shortDescription}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleCreateProductRows(concept)}
                  disabled={creatingRowsFor === concept.id}
                  className="flex-shrink-0 text-xs font-bold px-4 py-2 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {creatingRowsFor === concept.id ? "Creating…" : "Create Product Rows"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success banner after row creation */}
      {createRowsSuccess && (
        <div className="rounded-2xl border border-tropical-green/30 bg-tropical-green/10 px-4 py-3 flex items-start gap-3">
          <span className="text-tropical-green text-base flex-shrink-0">✓</span>
          <p className="text-sm font-semibold text-tropical-green/90 leading-snug">{createRowsSuccess}</p>
          <button
            type="button"
            onClick={() => setCreateRowsSuccess("")}
            className="ml-auto flex-shrink-0 text-xs text-tropical-green/60 hover:text-tropical-green transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      <hr className="border-tiki-brown/8" />

      <div className="flex flex-col gap-8">
        {config.sections.map((section) => (
          <CollectableSectionPanel
            key={section.id}
            section={section}
            uploadStates={uploadStates}
            onGalleryUpload={handleGalleryUpload}
            onSetRole={handleSetRole}
            onClearRole={handleClearRole}
            onArchiveImage={handleArchiveImage}
            onUpdateAltText={handleUpdateAltText}
            onUpdateItem={handleUpdateItem}
            onToggleEnabled={handleToggleEnabled}
            onUpdateSection={(patch) => handleUpdateSection(section.id, patch)}
            onAddProductOption={(opt) => handleAddProductOption(section.id, opt)}
            onMoveItem={(itemId, dir) => handleMoveItem(section.id, itemId, dir)}
          />
        ))}
      </div>

      {config.sections.length === 0 && (
        <div className="rounded-2xl border border-dashed border-tiki-brown/15 px-6 py-10 text-center">
          <p className="text-sm text-tiki-brown/40">
            No product sections yet. Create a Product Concept below and use &ldquo;Create Product Rows&rdquo; above.
          </p>
        </div>
      )}

      <p className="text-xs text-tiki-brown/35 leading-relaxed">
        Images upload to Vercel Blob. Saving commits collectables.json to GitHub.
        Public shop updates after the next deployment.
      </p>
    </div>
  );
}
