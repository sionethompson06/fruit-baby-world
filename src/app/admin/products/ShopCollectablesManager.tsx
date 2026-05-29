"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type {
  ShopCollectablesConfig,
  ShopCollectablesSection,
  ShopCollectableItem,
  ShopCollectableProductType,
} from "@/lib/shopCollectablesTypes";

type UploadStatus = "idle" | "uploading" | "done" | "error";

type ItemUploadState = {
  status: UploadStatus;
  message?: string;
  previewUrl?: string; // local blob URL for instant preview before save
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

// ─── Single item row ─────────────────────────────────────────────────────────

function CollectableItemRow({
  item,
  uploadState,
  onUpload,
  onToggleEnabled,
}: {
  item: ShopCollectableItem;
  uploadState: ItemUploadState;
  onUpload: (file: File) => void;
  onToggleEnabled: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const displayImage = uploadState.previewUrl || (item.imageUrl || null);

  return (
    <div className="flex items-start gap-4 bg-white rounded-2xl border border-tiki-brown/10 p-4">
      {/* Image preview / placeholder */}
      <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-tiki-brown/5 border border-tiki-brown/10 flex items-center justify-center relative">
        {displayImage ? (
          <Image
            src={displayImage}
            alt={`${item.characterName} ${item.productType}`}
            fill
            className="object-contain"
            sizes="80px"
            unoptimized={displayImage.startsWith("blob:")}
          />
        ) : (
          <span className="text-3xl opacity-25">🛍️</span>
        )}
      </div>

      {/* Info + upload */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
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

        <p className="text-xs text-tiki-brown/45 font-semibold">{item.statusLabel}</p>

        {item.imageUrl && !uploadState.previewUrl && (
          <p className="text-xs text-tropical-green/70 font-medium truncate max-w-xs">
            ✓ Image saved
          </p>
        )}

        {uploadState.status === "error" && (
          <p className="text-xs text-warm-coral font-semibold">{uploadState.message ?? "Upload failed."}</p>
        )}
        {uploadState.status === "done" && (
          <p className="text-xs text-tropical-green font-semibold">✓ Uploaded — click Save to commit.</p>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadState.status === "uploading"}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-ube-purple/10 text-ube-purple hover:bg-ube-purple/18 transition-colors disabled:opacity-50"
          >
            {uploadState.status === "uploading" ? "Uploading…" : displayImage ? "Replace Image" : "Upload Image"}
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
    </div>
  );
}

// ─── Section panel ────────────────────────────────────────────────────────────

function CollectableSectionPanel({
  section,
  uploadStates,
  onUpload,
  onToggleEnabled,
}: {
  section: ShopCollectablesSection;
  uploadStates: Record<string, ItemUploadState>;
  onUpload: (itemId: string, file: File) => void;
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
            onUpload={(file) => onUpload(item.id, file)}
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

  async function handleUpload(itemId: string, file: File) {
    const found = findItem(itemId);
    if (!found) return;

    const localPreview = URL.createObjectURL(file);
    setItemUploadState(itemId, { status: "uploading", previewUrl: localPreview, message: undefined });

    try {
      const base64 = await fileToBase64(file);
      const res = await fetch("/api/media/upload-shop-collectable-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: base64,
          mimeType: file.type,
          characterSlug: found.item.characterSlug,
          productType: found.item.productType,
        }),
      });
      const data = await res.json() as { ok: boolean; imageUrl?: string; pathname?: string; message?: string };
      if (!data.ok || !data.imageUrl) {
        setItemUploadState(itemId, { status: "error", message: data.message ?? "Upload failed." });
        return;
      }
      updateItemInConfig(found.section.id, itemId, {
        imageUrl: data.imageUrl,
        imagePathname: data.pathname ?? "",
      });
      setItemUploadState(itemId, { status: "done", previewUrl: undefined });
      setSaveStatus("idle");
    } catch {
      setItemUploadState(itemId, { status: "error", message: "Network error during upload." });
    }
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
      const data = await res.json() as { ok: boolean; config?: ShopCollectablesConfig; message?: string };
      if (!data.ok) {
        setSaveStatus("error");
        setSaveMessage(data.message ?? "Save failed.");
        return;
      }
      if (data.config) setConfig(data.config);
      setSaveStatus("saved");
      setSaveMessage("Saved to GitHub.");
      // Clear all upload states after successful save
      setUploadStates({});
    } catch {
      setSaveStatus("error");
      setSaveMessage("Network error while saving.");
    }
  }

  const hasUnsavedUploads = Object.values(uploadStates).some((s) => s.status === "done");

  return (
    <div className="flex flex-col gap-6 bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-black text-tiki-brown">🛍️ Shop Collectables</h2>
          <p className="text-xs text-tiki-brown/55 mt-0.5">
            Upload product images for plushy and squishy collectables. Click Save after uploading.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === "saved" && (
            <p className="text-xs text-tropical-green font-semibold">{saveMessage}</p>
          )}
          {saveStatus === "error" && (
            <p className="text-xs text-warm-coral font-semibold">{saveMessage}</p>
          )}
          {hasUnsavedUploads && saveStatus !== "saving" && (
            <p className="text-xs text-pineapple-yellow/90 font-semibold">Unsaved uploads</p>
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

      <hr className="border-tiki-brown/8" />

      {/* Sections */}
      {config.sections.map((section) => (
        <CollectableSectionPanel
          key={section.id}
          section={section}
          uploadStates={uploadStates}
          onUpload={handleUpload}
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
