"use client";

import { useRef, useState } from "react";
import type {
  ShopCollectablesConfig,
  ShopCollectablesSection,
  ShopCollectableItem,
  ShopCollectableImage,
} from "@/lib/shopCollectablesTypes";

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
      {/* Thumbnail */}
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
        {/* Role badge overlay */}
        <div className="absolute top-0.5 right-0.5 flex flex-col gap-0.5 items-end">
          {isPrimary && (
            <span className="text-[7px] font-black px-1 py-px rounded bg-pineapple-yellow text-tiki-brown leading-none">
              P
            </span>
          )}
          {isHover && (
            <span className="text-[7px] font-black px-1 py-px rounded bg-ube-purple text-white leading-none">
              H
            </span>
          )}
          {isClick && (
            <span className="text-[7px] font-black px-1 py-px rounded bg-tropical-green text-white leading-none">
              C
            </span>
          )}
        </div>
      </div>

      {/* Filename */}
      <p
        className="text-[9px] text-tiki-brown/40 truncate leading-none"
        title={image.originalFilename ?? image.id}
      >
        {image.originalFilename ?? "—"}
      </p>

      {/* Role + archive buttons */}
      <div className="flex gap-px">
        <button
          type="button"
          onClick={onSetPrimary}
          title="Set as Primary Card Image"
          className={`flex-1 text-[9px] font-black py-0.5 rounded transition-colors ${
            isPrimary
              ? "bg-pineapple-yellow/60 text-tiki-brown"
              : "bg-tiki-brown/6 text-tiki-brown/45 hover:bg-pineapple-yellow/30"
          }`}
        >
          P
        </button>
        <button
          type="button"
          onClick={onSetHover}
          title="Set as Hover / Flip Image"
          className={`flex-1 text-[9px] font-black py-0.5 rounded transition-colors ${
            isHover
              ? "bg-ube-purple/35 text-ube-purple"
              : "bg-tiki-brown/6 text-tiki-brown/45 hover:bg-ube-purple/20"
          }`}
        >
          H
        </button>
        <button
          type="button"
          onClick={onSetClick}
          title="Set as Click / Large View Image"
          className={`flex-1 text-[9px] font-black py-0.5 rounded transition-colors ${
            isClick
              ? "bg-tropical-green/30 text-tropical-green"
              : "bg-tiki-brown/6 text-tiki-brown/45 hover:bg-tropical-green/20"
          }`}
        >
          C
        </button>
        <button
          type="button"
          onClick={onArchive}
          title="Archive — removes from gallery without deleting the file"
          className="flex-1 text-[9px] font-black py-0.5 rounded bg-tiki-brown/5 text-warm-coral/70 hover:bg-warm-coral/15 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Alt text — editable inline */}
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
      <p className="text-[9px] font-black text-tiki-brown/40 uppercase tracking-wide mb-0.5">
        Assigned Roles
      </p>
      {/* Primary */}
      <div className="flex items-center gap-1.5">
        <span className="font-black text-pineapple-yellow/90 w-12 flex-shrink-0">Primary</span>
        <span className="truncate flex-1 text-tiki-brown/65">
          {primaryImage ? shortName(primaryImage) : notSet}
        </span>
      </div>
      {/* Hover */}
      <div className="flex items-center gap-1.5">
        <span className="font-black text-ube-purple/70 w-12 flex-shrink-0">Hover</span>
        <span className="truncate flex-1 text-tiki-brown/65">
          {hoverImage ? shortName(hoverImage) : notSet}
        </span>
        {hoverImage && (
          <button
            type="button"
            onClick={() => onClearRole("hover")}
            className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-tiki-brown/8 text-tiki-brown/45 hover:bg-warm-coral/15 hover:text-warm-coral/70 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
      {/* Click */}
      <div className="flex items-center gap-1.5">
        <span className="font-black text-tropical-green/70 w-12 flex-shrink-0">Click</span>
        <span className="truncate flex-1 text-tiki-brown/65">
          {clickImage ? shortName(clickImage) : notSet}
        </span>
        {clickImage && (
          <button
            type="button"
            onClick={() => onClearRole("click")}
            className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-tiki-brown/8 text-tiki-brown/45 hover:bg-warm-coral/15 hover:text-warm-coral/70 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Single item row ─────────────────────────────────────────────────────────

function CollectableItemRow({
  item,
  uploadState,
  onGalleryUpload,
  onSetRole,
  onClearRole,
  onArchiveImage,
  onUpdateAltText,
  onToggleEnabled,
}: {
  item: ShopCollectableItem;
  uploadState: ItemUploadState;
  onGalleryUpload: (file: File) => void;
  onSetRole: (imageId: string, role: "primary" | "hover" | "click") => void;
  onClearRole: (role: "hover" | "click") => void;
  onArchiveImage: (imageId: string) => void;
  onUpdateAltText: (imageId: string, altText: string) => void;
  onToggleEnabled: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeImages = getActiveImages(item);
  const atMax = activeImages.length >= 4;
  const isUploading = uploadState.status === "uploading";

  return (
    <div className="bg-white rounded-2xl border border-tiki-brown/10 p-4 flex flex-col gap-3">
      {/* ── Row header ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Legacy / current primary image preview */}
        <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-tiki-brown/5 border border-tiki-brown/10 flex items-center justify-center">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={`${item.characterName} ${item.productType}`}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-2xl opacity-20">🛍️</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-black text-tiki-brown">{item.characterName}</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pineapple-yellow/20 text-tiki-brown/70 capitalize">
              {item.productType}
            </span>
            {!item.enabled && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/45">
                Hidden
              </span>
            )}
          </div>
          <p className="text-xs text-tiki-brown/45 font-semibold mt-0.5">{item.statusLabel}</p>
        </div>

        <button
          type="button"
          onClick={onToggleEnabled}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-tiki-brown/6 text-tiki-brown/55 hover:bg-tiki-brown/12 transition-colors flex-shrink-0"
        >
          {item.enabled ? "Hide" : "Show"}
        </button>
      </div>

      {/* ── Product Image Gallery ─────────────────────────────────────── */}
      <div className="border-t border-tiki-brown/8 pt-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-black text-tiki-brown/60 uppercase tracking-wide">
            Product Image Gallery
          </p>
          <span className="text-[10px] text-tiki-brown/35 font-semibold">
            {activeImages.length}/4
          </span>
        </div>

        {/* Helper text */}
        <p className="text-[10px] text-tiki-brown/45 leading-snug">
          <span className="font-bold text-pineapple-yellow/90">Primary</span> shows on the product
          card.{" "}
          <span className="font-bold text-ube-purple/70">Hover</span> appears when the visitor
          hovers on desktop.{" "}
          <span className="font-bold text-tropical-green/70">Click</span> opens first in the product
          modal. Use{" "}
          <span className="font-bold text-warm-coral/70">✕</span> to archive without deleting.
        </p>

        {/* Thumbnail grid */}
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

          {/* Add Image button */}
          {!atMax && (
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="w-[84px] h-[72px] rounded-xl border-2 border-dashed border-tiki-brown/20 flex items-center justify-center hover:bg-tiki-brown/4 hover:border-tiki-brown/35 transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <span className="text-lg text-tiki-brown/30 animate-pulse">⟳</span>
                ) : (
                  <span className="text-2xl text-tiki-brown/25">+</span>
                )}
              </button>
              <p className="text-[9px] text-tiki-brown/35 text-center leading-none">
                {isUploading ? "Uploading…" : "Add image"}
              </p>
            </div>
          )}
        </div>

        {atMax && (
          <p className="text-[10px] text-tiki-brown/40 italic">
            Maximum of 4 active product images reached.
          </p>
        )}

        {uploadState.status === "error" && (
          <p className="text-xs text-warm-coral font-semibold">{uploadState.message ?? "Upload failed."}</p>
        )}

        {/* Role summary */}
        {activeImages.length > 0 && (
          <RoleSummary item={item} activeImages={activeImages} onClearRole={onClearRole} />
        )}
      </div>

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

// ─── Section panel ────────────────────────────────────────────────────────────

function CollectableSectionPanel({
  section,
  uploadStates,
  onGalleryUpload,
  onSetRole,
  onClearRole,
  onArchiveImage,
  onUpdateAltText,
  onToggleEnabled,
}: {
  section: ShopCollectablesSection;
  uploadStates: Record<string, ItemUploadState>;
  onGalleryUpload: (itemId: string, file: File) => void;
  onSetRole: (itemId: string, imageId: string, role: "primary" | "hover" | "click") => void;
  onClearRole: (itemId: string, role: "hover" | "click") => void;
  onArchiveImage: (itemId: string, imageId: string) => void;
  onUpdateAltText: (itemId: string, imageId: string, altText: string) => void;
  onToggleEnabled: (itemId: string) => void;
}) {
  const emoji = section.productType === "plushy" ? "🧸" : "🫶";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xl">{emoji}</span>
        <h3 className="text-base font-black text-tiki-brown">{section.title}</h3>
        <span className="text-xs text-tiki-brown/45 ml-1">{section.description}</span>
      </div>
      <div className="flex flex-col gap-2">
        {section.items.map((item) => (
          <CollectableItemRow
            key={item.id}
            item={item}
            uploadState={uploadStates[item.id] ?? { status: "idle" }}
            onGalleryUpload={(file) => onGalleryUpload(item.id, file)}
            onSetRole={(imageId, role) => onSetRole(item.id, imageId, role)}
            onClearRole={(role) => onClearRole(item.id, role)}
            onArchiveImage={(imageId) => onArchiveImage(item.id, imageId)}
            onUpdateAltText={(imageId, altText) => onUpdateAltText(item.id, imageId, altText)}
            onToggleEnabled={() => onToggleEnabled(item.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main manager ─────────────────────────────────────────────────────────────

export default function ShopCollectablesManager({
  initialConfig,
}: {
  initialConfig: ShopCollectablesConfig;
}) {
  const [config, setConfig] = useState<ShopCollectablesConfig>(initialConfig);
  const [uploadStates, setUploadStates] = useState<Record<string, ItemUploadState>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");

  function setItemUploadState(itemId: string, patch: Partial<ItemUploadState>) {
    setUploadStates((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? { status: "idle" }), ...patch },
    }));
  }

  function updateItemInConfig(
    sectionId: string,
    itemId: string,
    patch: Partial<ShopCollectableItem>
  ) {
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
          characterSlug: found.item.characterSlug,
          productType: found.item.productType,
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

      // Re-fetch current item state (may have changed while upload was in flight)
      const latest = findItem(itemId);
      const currentItem = latest?.item ?? found.item;
      const currentImages = currentItem.images ?? [];

      const newImage: ShopCollectableImage = {
        id: data.image.id,
        imageUrl: data.image.imageUrl,
        imagePathname: data.image.imagePathname,
        originalFilename: data.image.originalFilename,
        // Default alt text so public image rendering has a safe fallback immediately
        altText: `${currentItem.characterName} ${currentItem.productType} product image`,
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
        // Auto-assign as primary and keep legacy imageUrl in sync
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

  function handleSetRole(
    itemId: string,
    imageId: string,
    role: "primary" | "hover" | "click"
  ) {
    const found = findItem(itemId);
    if (!found) return;

    const patch: Partial<ShopCollectableItem> = {};
    if (role === "primary") {
      patch.primaryImageId = imageId;
      // Keep legacy imageUrl in sync with the new primary
      const img = (found.item.images ?? []).find((i) => i.id === imageId);
      if (img) {
        patch.imageUrl = img.imageUrl;
        patch.imagePathname = img.imagePathname ?? "";
      }
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
    const patch: Partial<ShopCollectableItem> =
      role === "hover" ? { hoverImageId: undefined } : { clickImageId: undefined };
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
      const nextActive = updatedImages
        .filter((img) => !img.isArchived && img.id !== imageId)
        .sort((a, b) => a.sortOrder - b.sortOrder);
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

  function handleToggleEnabled(itemId: string) {
    const found = findItem(itemId);
    if (!found) return;
    updateItemInConfig(found.section.id, itemId, { enabled: !found.item.enabled });
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
            Manage product images for plushy and squishy collectables. Click Save after changes.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {saveStatus === "saved" && (
            <p className="text-xs text-tropical-green font-semibold">{saveMessage}</p>
          )}
          {saveStatus === "error" && (
            <p className="text-xs text-warm-coral font-semibold">{saveMessage}</p>
          )}
          {hasUnsaved && (
            <p className="text-xs text-pineapple-yellow/90 font-semibold">Unsaved changes</p>
          )}
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
        <span>
          <span className="font-black text-pineapple-yellow/90">P</span>{" "}
          <span className="font-semibold">Primary</span> — shown on the product card
        </span>
        <span>
          <span className="font-black text-ube-purple/70">H</span>{" "}
          <span className="font-semibold">Hover</span> — crossfades in on desktop hover
        </span>
        <span>
          <span className="font-black text-tropical-green/70">C</span>{" "}
          <span className="font-semibold">Click</span> — shown first when the modal opens
        </span>
        <span>
          <span className="font-black text-warm-coral/70">✕</span>{" "}
          <span className="font-semibold">Archive</span> — hides without deleting the file
        </span>
      </div>

      <hr className="border-tiki-brown/8" />

      {/* Sections */}
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
          onToggleEnabled={handleToggleEnabled}
        />
      ))}

      <p className="text-xs text-tiki-brown/35 leading-relaxed">
        Images upload to Vercel Blob. Saving commits collectables.json to GitHub.
        Public shop updates after the next deployment.
      </p>
    </div>
  );
}
