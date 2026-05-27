"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import type {
  HomepageShowcaseConfig,
  HomepageCharacterShowcaseItem,
  HomepageWorldShowcaseItem,
} from "@/lib/homepageShowcaseTypes";

type Tab = "hero" | "cast" | "tiki" | "worlds";

type SaveStatus = "idle" | "saving" | "saved" | "error";
type UploadStatus = "idle" | "uploading" | "done" | "error";

function isHttpsUrl(v: string) {
  return v.startsWith("https://");
}

// ─── Image Upload Widget ──────────────────────────────────────────────────────

function ImageUploadField({
  label,
  value,
  onUploaded,
  assetRole,
  itemId,
}: {
  label: string;
  value: string;
  onUploaded: (url: string) => void;
  assetRole: string;
  itemId?: string;
}) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setStatus("uploading");
      setError("");
      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const res = await fetch("/api/media/upload-homepage-showcase-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type,
            assetRole,
            itemId,
          }),
        });

        const data = (await res.json()) as { ok: boolean; imageUrl?: string; message?: string };
        if (!data.ok || !data.imageUrl) {
          setError(data.message ?? "Upload failed.");
          setStatus("error");
          return;
        }
        onUploaded(data.imageUrl);
        setStatus("done");
      } catch {
        setError("Unexpected error during upload.");
        setStatus("error");
      }
    },
    [assetRole, itemId, onUploaded]
  );

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-tiki-brown/70 uppercase tracking-wide">{label}</label>
      {value && isHttpsUrl(value) && (
        <div className="flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="w-16 h-20 object-contain object-bottom rounded-xl border border-tiki-brown/15 bg-tiki-brown/5 shadow-sm flex-shrink-0"
          />
          <div className="flex flex-col gap-1 min-w-0 pt-1">
            <span className="text-[10px] text-tiki-brown/45 font-mono break-all leading-tight line-clamp-2">
              {value}
            </span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="self-start text-xs font-bold px-3 py-1 rounded-lg bg-ube-purple/10 text-ube-purple hover:bg-ube-purple/18 transition-colors"
            >
              Replace
            </button>
          </div>
        </div>
      )}
      {(!value || !isHttpsUrl(value)) && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border-2 border-dashed border-tiki-brown/20 text-tiki-brown/50 hover:border-ube-purple/40 hover:text-ube-purple hover:bg-ube-purple/4 transition-all"
        >
          <span>📁</span>
          <span>Choose image (PNG / JPG / WebP)</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {status === "uploading" && (
        <span className="text-xs text-ube-purple font-semibold animate-pulse">Uploading…</span>
      )}
      {status === "done" && (
        <span className="text-xs text-tropical-green font-semibold">Uploaded</span>
      )}
      {status === "error" && (
        <span className="text-xs text-warm-coral font-semibold">{error}</span>
      )}
    </div>
  );
}

// ─── Text field ───────────────────────────────────────────────────────────────

function TextField({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const cls =
    "w-full text-sm text-tiki-brown bg-white border border-tiki-brown/15 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50 focus:ring-2 focus:ring-ube-purple/10 transition-all resize-none";
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-bold text-tiki-brown/70 uppercase tracking-wide">{label}</label>
      {multiline ? (
        <textarea
          className={cls}
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type="text"
          className={cls}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        className={`relative w-10 h-6 rounded-full transition-colors ${value ? "bg-tropical-green" : "bg-tiki-brown/20"}`}
        onClick={() => onChange(!value)}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-5" : "translate-x-1"}`}
        />
      </div>
      <span className="text-sm font-semibold text-tiki-brown/80">{label}</span>
    </label>
  );
}

// ─── Hero tab ─────────────────────────────────────────────────────────────────

function HeroTab({
  hero,
  onChange,
}: {
  hero: HomepageShowcaseConfig["hero"];
  onChange: (h: HomepageShowcaseConfig["hero"]) => void;
}) {
  const set = <K extends keyof typeof hero>(k: K, v: (typeof hero)[K]) =>
    onChange({ ...hero, [k]: v });

  const [modelUploadStatus, setModelUploadStatus] = useState<UploadStatus>("idle");
  const [modelUploadError, setModelUploadError] = useState("");
  const modelInputRef = useRef<HTMLInputElement>(null);

  const handleModelFile = useCallback(
    async (file: File) => {
      setModelUploadStatus("uploading");
      setModelUploadError("");
      try {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/media/upload-homepage-3d-model", {
          method: "POST",
          body: formData,
        });
        const data = (await res.json()) as {
          ok: boolean;
          modelUrl?: string;
          pathname?: string;
          modelType?: "glb" | "gltf";
          message?: string;
        };
        if (!data.ok || !data.modelUrl) {
          setModelUploadError(data.message ?? "Upload failed.");
          setModelUploadStatus("error");
          return;
        }
        onChange({
          ...hero,
          pineappleBabyModelUrl: data.modelUrl,
          pineappleBabyModelPathname: data.pathname ?? "",
          pineappleBabyModelType: data.modelType ?? "glb",
        });
        setModelUploadStatus("done");
      } catch {
        setModelUploadError("Unexpected error during upload.");
        setModelUploadStatus("error");
      }
    },
    [hero, onChange]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl border border-tiki-brown/10 p-5 flex flex-col gap-4">
        <h3 className="font-black text-tiki-brown text-sm uppercase tracking-wide">Copy</h3>
        <TextField label="Headline" value={hero.headline} onChange={(v) => set("headline", v)} />
        <TextField label="Subheadline" value={hero.subheadline} onChange={(v) => set("subheadline", v)} />
        <TextField
          label="Supporting Copy"
          value={hero.supportingCopy}
          onChange={(v) => set("supportingCopy", v)}
          multiline
        />
      </div>

      {/* ── Interactive 3D Hero Model ── */}
      <div className="bg-white rounded-2xl border-2 border-ube-purple/20 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-black text-tiki-brown text-sm uppercase tracking-wide">
              Interactive 3D Pineapple Baby Model
            </h3>
            <p className="text-xs text-tiki-brown/50 mt-1 leading-relaxed max-w-md">
              Upload a website-ready approved Pineapple Baby .glb or .gltf model. If enabled, this model appears as
              the interactive homepage hero. If no model is configured, the homepage uses the approved 3D/2D image fallback.
            </p>
          </div>
          <ToggleField
            label="Enable"
            value={hero.enableInteractiveHeroModel ?? false}
            onChange={(v) => set("enableInteractiveHeroModel", v)}
          />
        </div>

        {/* Model upload */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-tiki-brown/70 uppercase tracking-wide">
            GLB / GLTF Model File
          </label>
          {hero.pineappleBabyModelUrl?.startsWith("https://") ? (
            <div className="flex items-center gap-3 bg-ube-purple/5 rounded-xl px-4 py-3 border border-ube-purple/15">
              <span className="text-2xl" aria-hidden="true">🎡</span>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-xs font-bold text-tiki-brown/70">
                  Model uploaded — {hero.pineappleBabyModelType?.toUpperCase() ?? "GLB"}
                </span>
                <span className="text-[10px] text-tiki-brown/40 font-mono break-all line-clamp-1">
                  {hero.pineappleBabyModelUrl}
                </span>
              </div>
              <button
                type="button"
                onClick={() => modelInputRef.current?.click()}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-ube-purple/10 text-ube-purple hover:bg-ube-purple/18 transition-colors flex-shrink-0"
              >
                Replace
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => modelInputRef.current?.click()}
              className="flex items-center gap-2 text-xs font-bold px-4 py-3 rounded-xl border-2 border-dashed border-ube-purple/25 text-tiki-brown/50 hover:border-ube-purple/50 hover:text-ube-purple hover:bg-ube-purple/4 transition-all"
            >
              <span>📁</span>
              <span>Choose Pineapple Baby .glb or .gltf model</span>
            </button>
          )}
          <input
            ref={modelInputRef}
            type="file"
            accept=".glb,.gltf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleModelFile(file);
              e.target.value = "";
            }}
          />
          {modelUploadStatus === "uploading" && (
            <span className="text-xs text-ube-purple font-semibold animate-pulse">Uploading model…</span>
          )}
          {modelUploadStatus === "done" && (
            <span className="text-xs text-tropical-green font-semibold">Model uploaded successfully.</span>
          )}
          {modelUploadStatus === "error" && (
            <span className="text-xs text-warm-coral font-semibold">{modelUploadError}</span>
          )}
        </div>

        {/* Poster/fallback image */}
        <ImageUploadField
          label="Poster / Fallback Image (shown while model loads)"
          value={hero.pineappleBabyModelPosterUrl ?? ""}
          onUploaded={(url) => set("pineappleBabyModelPosterUrl", url)}
          assetRole="hero-3d"
          itemId="model-poster"
        />

        {/* Auto-rotate + interaction hint */}
        <div className="grid grid-cols-2 gap-4 items-start">
          <div className="flex flex-col gap-2">
            <ToggleField
              label="Auto-rotate"
              value={hero.heroModelAutoRotate !== false}
              onChange={(v) => set("heroModelAutoRotate", v)}
            />
          </div>
          <TextField
            label="Interaction hint text"
            value={hero.heroModelInteractionHint ?? "Drag to spin Pineapple Baby"}
            onChange={(v) => set("heroModelInteractionHint", v)}
            placeholder="Drag to spin Pineapple Baby"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-tiki-brown/10 p-5 flex flex-col gap-4">
        <h3 className="font-black text-tiki-brown text-sm uppercase tracking-wide">Hero Images</h3>
        <p className="text-xs text-tiki-brown/50 leading-relaxed">
          3D promo image takes priority over 2D. If both are empty, the character&apos;s action art is used as fallback.
          These are also used as the fallback when no interactive model is configured.
        </p>
        <ImageUploadField
          label="Pineapple Baby 2D Image"
          value={hero.pineappleBaby2dImageUrl ?? ""}
          onUploaded={(url) => set("pineappleBaby2dImageUrl", url)}
          assetRole="hero-2d"
        />
        <ImageUploadField
          label="Pineapple Baby 3D Promo Image"
          value={hero.pineappleBaby3dImageUrl ?? ""}
          onUploaded={(url) => set("pineappleBaby3dImageUrl", url)}
          assetRole="hero-3d"
        />
        <ImageUploadField
          label="Background Image"
          value={hero.backgroundImageUrl ?? ""}
          onUploaded={(url) => set("backgroundImageUrl", url)}
          assetRole="background"
        />
      </div>

      <div className="bg-white rounded-2xl border border-tiki-brown/10 p-5 flex flex-col gap-4">
        <h3 className="font-black text-tiki-brown text-sm uppercase tracking-wide">Call-to-Action Buttons</h3>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Primary CTA Label"
            value={hero.primaryCtaLabel}
            onChange={(v) => set("primaryCtaLabel", v)}
            placeholder="Read Storybooks"
          />
          <TextField
            label="Primary CTA Link"
            value={hero.primaryCtaHref}
            onChange={(v) => set("primaryCtaHref", v)}
            placeholder="/stories"
          />
          <TextField
            label="Secondary CTA Label"
            value={hero.secondaryCtaLabel}
            onChange={(v) => set("secondaryCtaLabel", v)}
            placeholder="Meet the Characters"
          />
          <TextField
            label="Secondary CTA Link"
            value={hero.secondaryCtaHref}
            onChange={(v) => set("secondaryCtaHref", v)}
            placeholder="/characters"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Supporting Cast tab ──────────────────────────────────────────────────────

function CastTab({
  cast,
  onChange,
}: {
  cast: HomepageShowcaseConfig["supportingCast"];
  onChange: (c: HomepageShowcaseConfig["supportingCast"]) => void;
}) {
  const setItem = (index: number, item: HomepageCharacterShowcaseItem) => {
    const items = [...cast.items];
    items[index] = item;
    onChange({ ...cast, items });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl border border-tiki-brown/10 p-5 flex flex-col gap-4">
        <h3 className="font-black text-tiki-brown text-sm uppercase tracking-wide">Section Header</h3>
        <TextField label="Section Title" value={cast.title} onChange={(v) => onChange({ ...cast, title: v })} />
        <TextField
          label="Description"
          value={cast.description ?? ""}
          onChange={(v) => onChange({ ...cast, description: v })}
          multiline
        />
      </div>

      <div className="flex flex-col gap-4">
        {cast.items.map((item, i) => (
          <div key={item.id} className="bg-white rounded-2xl border border-tiki-brown/10 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-tiki-brown/40 uppercase tracking-widest">#{i + 1}</span>
                <h4 className="font-black text-tiki-brown text-sm">{item.displayName}</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/50">
                  {item.role}
                </span>
              </div>
              <ToggleField
                label="Enabled"
                value={item.enabled}
                onChange={(v) => setItem(i, { ...item, enabled: v })}
              />
            </div>

            <TextField
              label="Caption"
              value={item.caption ?? ""}
              onChange={(v) => setItem(i, { ...item, caption: v })}
              placeholder="Short character trait or tagline"
            />

            <div className="grid grid-cols-2 gap-4">
              <ImageUploadField
                label="2D Image"
                value={item.image2dUrl ?? ""}
                onUploaded={(url) => setItem(i, { ...item, image2dUrl: url })}
                assetRole="supporting-cast"
                itemId={item.id}
              />
              <ImageUploadField
                label="3D Promo Image"
                value={item.image3dUrl ?? ""}
                onUploaded={(url) => setItem(i, { ...item, image3dUrl: url })}
                assetRole="supporting-cast"
                itemId={`${item.id}-3d`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tiki Trouble tab ─────────────────────────────────────────────────────────

function TikiTab({
  tiki,
  onChange,
}: {
  tiki: HomepageShowcaseConfig["tikiTrouble"];
  onChange: (t: HomepageShowcaseConfig["tikiTrouble"]) => void;
}) {
  const set = <K extends keyof typeof tiki>(k: K, v: (typeof tiki)[K]) =>
    onChange({ ...tiki, [k]: v });

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl border border-tiki-brown/10 p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-black text-tiki-brown text-sm uppercase tracking-wide">Tiki Trouble Section</h3>
          <ToggleField label="Enabled" value={tiki.enabled} onChange={(v) => set("enabled", v)} />
        </div>
        <TextField label="Display Name" value={tiki.displayName} onChange={(v) => set("displayName", v)} />
        <TextField label="Headline" value={tiki.headline} onChange={(v) => set("headline", v)} />
        <TextField
          label="Description"
          value={tiki.description}
          onChange={(v) => set("description", v)}
          multiline
        />
      </div>

      <div className="bg-white rounded-2xl border border-tiki-brown/10 p-5 flex flex-col gap-4">
        <h3 className="font-black text-tiki-brown text-sm uppercase tracking-wide">Images</h3>
        <p className="text-xs text-tiki-brown/50 leading-relaxed">
          3D promo image takes priority over 2D. If both are empty, the character&apos;s action art is used as fallback.
        </p>
        <ImageUploadField
          label="Tiki 2D Image"
          value={tiki.image2dUrl ?? ""}
          onUploaded={(url) => set("image2dUrl", url)}
          assetRole="tiki"
          itemId="tiki-2d"
        />
        <ImageUploadField
          label="Tiki 3D Promo Image"
          value={tiki.image3dUrl ?? ""}
          onUploaded={(url) => set("image3dUrl", url)}
          assetRole="tiki"
          itemId="tiki-3d"
        />
      </div>
    </div>
  );
}

// ─── Worlds tab ───────────────────────────────────────────────────────────────

function WorldsTab({
  worlds,
  onChange,
}: {
  worlds: HomepageShowcaseConfig["worlds"];
  onChange: (w: HomepageShowcaseConfig["worlds"]) => void;
}) {
  const setItem = (index: number, item: HomepageWorldShowcaseItem) => {
    const items = [...worlds.items];
    items[index] = item;
    onChange({ ...worlds, items });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-2xl border border-tiki-brown/10 p-5 flex flex-col gap-4">
        <h3 className="font-black text-tiki-brown text-sm uppercase tracking-wide">Section Header</h3>
        <TextField label="Section Title" value={worlds.title} onChange={(v) => onChange({ ...worlds, title: v })} />
        <TextField
          label="Description"
          value={worlds.description ?? ""}
          onChange={(v) => onChange({ ...worlds, description: v })}
          multiline
        />
      </div>

      <div className="flex flex-col gap-4">
        {worlds.items.map((item, i) => (
          <div key={item.id} className="bg-white rounded-2xl border border-tiki-brown/10 p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-tiki-brown/40 uppercase tracking-widest">#{i + 1}</span>
                <h4 className="font-black text-tiki-brown text-sm">{item.title}</h4>
              </div>
              <ToggleField
                label="Enabled"
                value={item.enabled}
                onChange={(v) => setItem(i, { ...item, enabled: v })}
              />
            </div>

            <TextField
              label="Description"
              value={item.description ?? ""}
              onChange={(v) => setItem(i, { ...item, description: v })}
              multiline
              placeholder="Short description of this world location"
            />

            <ImageUploadField
              label="Location Image"
              value={item.imageUrl ?? ""}
              onUploaded={(url) => setItem(i, { ...item, imageUrl: url })}
              assetRole="world"
              itemId={item.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export default function HomepageShowcaseEditor({
  initialConfig,
}: {
  initialConfig: HomepageShowcaseConfig;
}) {
  const [config, setConfig] = useState<HomepageShowcaseConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<Tab>("hero");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState("");

  const handleSave = async () => {
    setSaveStatus("saving");
    setSaveError("");
    try {
      const res = await fetch("/api/github/save-homepage-showcase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!data.ok) {
        setSaveError(data.message ?? "Save failed.");
        setSaveStatus("error");
        return;
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveError("Unexpected error. Please try again.");
      setSaveStatus("error");
    }
  };

  const tabs: { id: Tab; label: string; emoji: string }[] = [
    { id: "hero", label: "Hero", emoji: "🌟" },
    { id: "cast", label: "Cast", emoji: "🍓" },
    { id: "tiki", label: "Tiki", emoji: "⚡" },
    { id: "worlds", label: "Worlds", emoji: "🌍" },
  ];

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* Header */}
      <div className="bg-gradient-to-b from-ube-purple/12 via-bg-cream to-bg-cream border-b border-ube-purple/12 px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Admin
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-pineapple-yellow/30 text-tiki-brown uppercase tracking-widest">
              Homepage Showcase
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-tiki-brown leading-tight">
                Homepage <span className="text-ube-purple">Showcase</span>
              </h1>
              <p className="text-tiki-brown/58 text-sm mt-1">
                Manage hero images, character showcase, Tiki Trouble, and world locations.
              </p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <Link
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-bold px-4 py-2 rounded-xl border border-tiki-brown/15 text-tiki-brown/60 hover:text-tiki-brown hover:border-tiki-brown/30 transition-all"
              >
                Preview Homepage →
              </Link>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveStatus === "saving"}
                className={`flex items-center gap-2 text-sm font-black px-6 py-2.5 rounded-2xl shadow-sm transition-all ${
                  saveStatus === "saving"
                    ? "bg-ube-purple/50 text-white cursor-wait"
                    : saveStatus === "saved"
                    ? "bg-tropical-green text-white"
                    : saveStatus === "error"
                    ? "bg-warm-coral text-white"
                    : "bg-ube-purple text-white hover:bg-ube-purple/85 hover:shadow-md"
                }`}
              >
                {saveStatus === "saving" && <span className="animate-pulse">Saving…</span>}
                {saveStatus === "saved" && <span>Saved ✓</span>}
                {saveStatus === "error" && <span>Error — Retry?</span>}
                {saveStatus === "idle" && <span>Save to GitHub</span>}
              </button>
            </div>
          </div>
          {saveStatus === "error" && saveError && (
            <div className="mt-3 text-xs text-warm-coral font-semibold bg-warm-coral/8 rounded-xl px-4 py-2 border border-warm-coral/20">
              {saveError}
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-tiki-brown/10 bg-white/60 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 flex gap-1 py-2">
          {tabs.map(({ id, label, emoji }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black transition-all ${
                activeTab === id
                  ? "bg-ube-purple text-white shadow-sm"
                  : "text-tiki-brown/60 hover:bg-tiki-brown/8 hover:text-tiki-brown"
              }`}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        {activeTab === "hero" && (
          <HeroTab hero={config.hero} onChange={(h) => setConfig({ ...config, hero: h })} />
        )}
        {activeTab === "cast" && (
          <CastTab
            cast={config.supportingCast}
            onChange={(c) => setConfig({ ...config, supportingCast: c })}
          />
        )}
        {activeTab === "tiki" && (
          <TikiTab
            tiki={config.tikiTrouble}
            onChange={(t) => setConfig({ ...config, tikiTrouble: t })}
          />
        )}
        {activeTab === "worlds" && (
          <WorldsTab
            worlds={config.worlds}
            onChange={(w) => setConfig({ ...config, worlds: w })}
          />
        )}

        {/* Bottom save bar */}
        <div className="mt-10 flex items-center justify-between gap-4 border-t border-dashed border-tiki-brown/12 pt-8">
          <p className="text-xs text-tiki-brown/40 leading-relaxed max-w-xs">
            Changes are saved to GitHub and take effect after the next deployment or cache refresh.
          </p>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className={`flex items-center gap-2 text-sm font-black px-7 py-3 rounded-2xl shadow-sm transition-all ${
              saveStatus === "saving"
                ? "bg-ube-purple/50 text-white cursor-wait"
                : saveStatus === "saved"
                ? "bg-tropical-green text-white"
                : saveStatus === "error"
                ? "bg-warm-coral text-white"
                : "bg-ube-purple text-white hover:bg-ube-purple/85 hover:shadow-md"
            }`}
          >
            {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : "Save to GitHub"}
          </button>
        </div>
      </div>
    </div>
  );
}
