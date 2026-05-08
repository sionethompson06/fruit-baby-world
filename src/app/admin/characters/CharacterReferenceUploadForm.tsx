"use client";

import { useState, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CharacterOption = {
  slug: string;
  name: string;
  isDraft: boolean;
};

const ASSET_TYPE_OPTIONS = [
  { value: "profile-sheet", label: "Profile Sheet" },
  { value: "character-sheet", label: "Character Sheet" },
  { value: "expression-sheet", label: "Expression Sheet" },
  { value: "reference-guide", label: "Reference Guide" },
  { value: "other", label: "Other" },
];

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"];

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "success"; assetTitle: string; blobUrl: string; characterSlug: string }
  | { status: "error"; message: string };

// ─── Form field components ────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">
      {children}
      {required && <span className="text-warm-coral/70 ml-0.5">*</span>}
    </p>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CharacterReferenceUploadForm({
  characters,
}: {
  characters: CharacterOption[];
}) {
  const [characterSlug, setCharacterSlug] = useState("");
  const [assetType, setAssetType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setCharacterSlug("");
    setAssetType("");
    setTitle("");
    setDescription("");
    setNotes("");
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { setFileError(null); return; }
    if (!ALLOWED_MIME.includes(file.type)) {
      setFileError("File must be a PNG, JPEG, or WebP image.");
      return;
    }
    if (file.size === 0) {
      setFileError("File must not be empty.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError("File must be 10 MB or smaller.");
      return;
    }
    setFileError(null);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const file = fileInputRef.current?.files?.[0];
    if (!file) { setFileError("Please select a file."); return; }
    if (fileError) return;

    const fd = new FormData();
    fd.append("characterSlug", characterSlug);
    fd.append("assetType", assetType);
    fd.append("title", title);
    fd.append("description", description);
    fd.append("notes", notes);
    fd.append("file", file);

    setUploadState({ status: "uploading" });

    try {
      const res = await fetch("/api/reference-assets/upload-character-reference", {
        method: "POST",
        body: fd,
      });

      const data = (await res.json()) as
        | { ok: true; status: "uploaded"; asset: { title: string; blobUrl: string; characterSlug: string } }
        | { ok: false; message: string };

      if (data.ok) {
        setUploadState({
          status: "success",
          assetTitle: data.asset.title,
          blobUrl: data.asset.blobUrl,
          characterSlug: data.asset.characterSlug,
        });
        resetForm();
      } else {
        setUploadState({ status: "error", message: data.message });
      }
    } catch {
      setUploadState({
        status: "error",
        message: "Network error — check your connection and try again.",
      });
    }
  }

  const isSubmitting = uploadState.status === "uploading";
  const canSubmit =
    !isSubmitting &&
    characterSlug &&
    assetType &&
    title.trim().length > 0 &&
    !fileError;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Upload success banner */}
      {uploadState.status === "success" && (
        <div className="flex items-start gap-3 bg-tropical-green/10 border border-tropical-green/30 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0">✅</span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold text-tiki-brown/80">
              Reference asset uploaded successfully.
            </p>
            <p className="text-xs text-tiki-brown/60">
              <strong>{uploadState.assetTitle}</strong> for {uploadState.characterSlug} has been
              uploaded to Vercel Blob and recorded in GitHub. It defaults to{" "}
              <span className="font-bold text-warm-coral/70">approvedForGeneration: false</span> and
              requires human review before use.
            </p>
            <button
              type="button"
              onClick={() => setUploadState({ status: "idle" })}
              className="text-xs font-bold text-ube-purple hover:text-ube-purple/70 transition-colors self-start mt-0.5"
            >
              Upload another →
            </button>
          </div>
        </div>
      )}

      {/* Upload error banner */}
      {uploadState.status === "error" && (
        <div className="flex items-start gap-3 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0">⚠️</span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold text-tiki-brown/80">Upload failed.</p>
            <p className="text-xs text-tiki-brown/65 leading-relaxed">{uploadState.message}</p>
            <button
              type="button"
              onClick={() => setUploadState({ status: "idle" })}
              className="text-xs font-bold text-ube-purple hover:text-ube-purple/70 transition-colors self-start mt-0.5"
            >
              Try again →
            </button>
          </div>
        </div>
      )}

      {/* Character selector */}
      <div>
        <FieldLabel required>Character</FieldLabel>
        <select
          value={characterSlug}
          onChange={(e) => setCharacterSlug(e.target.value)}
          required
          disabled={isSubmitting}
          className="w-full text-sm text-tiki-brown bg-white border border-tiki-brown/20 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50 disabled:opacity-50"
        >
          <option value="">— Select character —</option>
          {characters.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}{c.isDraft ? " (Draft)" : ""}
            </option>
          ))}
        </select>
        {characterSlug && characters.find((c) => c.slug === characterSlug)?.isDraft && (
          <p className="text-xs text-tiki-brown/45 mt-1 leading-relaxed">
            Draft character — uploads remain <strong className="font-semibold">needs-review</strong> and are not approved for generation automatically.
          </p>
        )}
      </div>

      {/* Asset type selector */}
      <div>
        <FieldLabel required>Asset Type</FieldLabel>
        <select
          value={assetType}
          onChange={(e) => setAssetType(e.target.value)}
          required
          disabled={isSubmitting}
          className="w-full text-sm text-tiki-brown bg-white border border-tiki-brown/20 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50 disabled:opacity-50"
        >
          <option value="">— Select asset type —</option>
          {ASSET_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div>
        <FieldLabel required>Title</FieldLabel>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Pineapple Baby Official Profile Sheet v1"
          required
          maxLength={200}
          disabled={isSubmitting}
          className="w-full text-sm text-tiki-brown bg-white border border-tiki-brown/20 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50 placeholder:text-tiki-brown/30 disabled:opacity-50"
        />
      </div>

      {/* Description */}
      <div>
        <FieldLabel>Description (optional)</FieldLabel>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this reference asset"
          maxLength={500}
          rows={2}
          disabled={isSubmitting}
          className="w-full text-sm text-tiki-brown bg-white border border-tiki-brown/20 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50 placeholder:text-tiki-brown/30 resize-none disabled:opacity-50"
        />
      </div>

      {/* Notes */}
      <div>
        <FieldLabel>Admin Notes (optional)</FieldLabel>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any notes about intended use, source, or review requirements"
          maxLength={500}
          rows={2}
          disabled={isSubmitting}
          className="w-full text-sm text-tiki-brown bg-white border border-tiki-brown/20 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50 placeholder:text-tiki-brown/30 resize-none disabled:opacity-50"
        />
      </div>

      {/* File input */}
      <div>
        <FieldLabel required>Reference Image File</FieldLabel>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          required
          disabled={isSubmitting}
          className="w-full text-sm text-tiki-brown/70 bg-white border border-tiki-brown/20 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50 file:mr-3 file:text-xs file:font-bold file:bg-tiki-brown/8 file:text-tiki-brown/65 file:border-0 file:rounded-lg file:px-3 file:py-1 disabled:opacity-50"
        />
        {fileError ? (
          <p className="text-xs font-semibold text-warm-coral/75 mt-1">{fileError}</p>
        ) : (
          <p className="text-xs text-tiki-brown/35 mt-1">PNG, JPEG, or WebP — max 10 MB</p>
        )}
      </div>

      {/* Review warning */}
      <div className="flex items-start gap-3 bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">⚠️</span>
        <p className="text-xs text-tiki-brown/70 leading-relaxed">
          Uploaded assets default to{" "}
          <strong className="font-bold">approvedForGeneration: false</strong> and{" "}
          <strong className="font-bold">reviewStatus: needs-review</strong>. Human review is required
          before any asset may be used for reference-anchored generation. Nothing is published
          automatically.
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="self-start text-sm font-bold px-5 py-2.5 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Uploading…" : "Upload Reference Asset"}
      </button>
    </form>
  );
}
