"use client";

import { useState } from "react";

type StorybookStatus = "draft" | "published" | "hidden" | "archived";

type WorkingAction = "publish" | "unpublish" | "hide" | "archive" | "restore";

const STATUS_META: Record<
  StorybookStatus,
  { label: string; icon: string; description: string; panelClass: string; badgeClass: string }
> = {
  published: {
    label: "Published",
    icon: "✅",
    description: "Visible to the public on /stories.",
    panelClass: "bg-tropical-green/8 border-tropical-green/25",
    badgeClass: "bg-tropical-green/20 text-tropical-green",
  },
  hidden: {
    label: "Hidden from Public",
    icon: "👁️",
    description: "Not visible publicly. Still editable in admin.",
    panelClass: "bg-sky-blue/8 border-sky-blue/20",
    badgeClass: "bg-sky-blue/20 text-tiki-brown/70",
  },
  archived: {
    label: "Archived",
    icon: "📦",
    description: "Removed from public and admin lists. All files preserved.",
    panelClass: "bg-warm-coral/8 border-warm-coral/20",
    badgeClass: "bg-warm-coral/15 text-warm-coral/80",
  },
  draft: {
    label: "Draft",
    icon: "📝",
    description: "Not published. Editable in admin only.",
    panelClass: "bg-tiki-brown/5 border-tiki-brown/15",
    badgeClass: "bg-tiki-brown/10 text-tiki-brown/60",
  },
};

export default function StorybookVisibilityControls({
  slug,
  initialStatus,
}: {
  slug: string;
  initialStatus: StorybookStatus;
}) {
  const [currentStatus, setCurrentStatus] = useState<StorybookStatus>(initialStatus);
  const [working, setWorking] = useState<WorkingAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isWorking = working !== null;
  const meta = STATUS_META[currentStatus];

  async function callPublish() {
    if (!confirm("Publish this storybook? It will become visible on /stories.")) return;
    setWorking("publish");
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/github/publish-storybook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeSlug: slug, makeAllBookImagesPublic: true }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string; blockers?: string[] };
      if (!data.ok) {
        setError(data.blockers?.join(" ") || data.message || "Failed to publish.");
      } else {
        setCurrentStatus("published");
        setSuccessMsg("Storybook published and now live on /stories.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setWorking(null);
    }
  }

  async function callStatusRoute(
    newStatus: "draft" | "hidden" | "archived",
    action: WorkingAction,
    confirmMsg: string
  ) {
    if (!confirm(confirmMsg)) return;
    setWorking(action);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch("/api/github/update-storybook-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeSlug: slug, status: newStatus }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!data.ok) {
        setError(data.message ?? "Failed to update status.");
      } else {
        setCurrentStatus(newStatus);
        const msgs: Record<string, string> = {
          unpublish: "Removed from public. Storybook is now a draft.",
          hide: "Hidden from public pages.",
          archive:
            "Storybook archived. All uploaded files are preserved.",
          restore: "Restored to draft.",
        };
        setSuccessMsg(msgs[action] ?? "Status updated.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setWorking(null);
    }
  }

  return (
    <div className={`rounded-2xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 ${meta.panelClass}`}>

      {/* Left: status info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="text-xl flex-shrink-0" aria-hidden="true">{meta.icon}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
              Storybook Visibility
            </span>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${meta.badgeClass}`}>
              {meta.label}
            </span>
          </div>
          <p className="text-xs text-tiki-brown/55 mt-0.5 leading-snug">{meta.description}</p>
        </div>
      </div>

      {/* Right: action buttons */}
      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
        {currentStatus === "published" && (
          <>
            <ActionBtn
              label="Remove from Public"
              loadingLabel="Saving…"
              loading={working === "unpublish"}
              disabled={isWorking}
              variant="neutral"
              onClick={() =>
                callStatusRoute(
                  "draft",
                  "unpublish",
                  "Remove this storybook from public pages? It will remain editable in admin."
                )
              }
            />
            <ActionBtn
              label="Hide from Public"
              loadingLabel="Saving…"
              loading={working === "hide"}
              disabled={isWorking}
              variant="subtle"
              onClick={() =>
                callStatusRoute(
                  "hidden",
                  "hide",
                  "Hide this storybook from public pages? It will remain editable in admin."
                )
              }
            />
            <ActionBtn
              label="Archive Storybook"
              loadingLabel="Archiving…"
              loading={working === "archive"}
              disabled={isWorking}
              variant="danger"
              onClick={() =>
                callStatusRoute(
                  "archived",
                  "archive",
                  "Archive this storybook? It will be removed from public pages and normal admin lists. Uploaded files will not be deleted."
                )
              }
            />
          </>
        )}

        {currentStatus === "hidden" && (
          <>
            <ActionBtn
              label="Publish Storybook"
              loadingLabel="Publishing…"
              loading={working === "publish"}
              disabled={isWorking}
              variant="green"
              onClick={callPublish}
            />
            <ActionBtn
              label="Move to Draft"
              loadingLabel="Saving…"
              loading={working === "unpublish"}
              disabled={isWorking}
              variant="neutral"
              onClick={() =>
                callStatusRoute(
                  "draft",
                  "unpublish",
                  "Move this storybook to draft? It will remain editable in admin."
                )
              }
            />
            <ActionBtn
              label="Archive Storybook"
              loadingLabel="Archiving…"
              loading={working === "archive"}
              disabled={isWorking}
              variant="danger"
              onClick={() =>
                callStatusRoute(
                  "archived",
                  "archive",
                  "Archive this storybook? Uploaded files will not be deleted."
                )
              }
            />
          </>
        )}

        {currentStatus === "archived" && (
          <ActionBtn
            label="Restore to Draft"
            loadingLabel="Restoring…"
            loading={working === "restore"}
            disabled={isWorking}
            variant="neutral"
            onClick={() =>
              callStatusRoute(
                "draft",
                "restore",
                "Restore this storybook to draft? It will become editable again in admin."
              )
            }
          />
        )}

        {currentStatus === "draft" && (
          <>
            <ActionBtn
              label="Hide from Public"
              loadingLabel="Saving…"
              loading={working === "hide"}
              disabled={isWorking}
              variant="subtle"
              onClick={() =>
                callStatusRoute(
                  "hidden",
                  "hide",
                  "Hide this storybook? It is already a draft, so this mainly marks it as intentionally hidden."
                )
              }
            />
            <ActionBtn
              label="Archive Storybook"
              loadingLabel="Archiving…"
              loading={working === "archive"}
              disabled={isWorking}
              variant="danger"
              onClick={() =>
                callStatusRoute(
                  "archived",
                  "archive",
                  "Archive this storybook? It will be removed from normal admin lists. Uploaded files will not be deleted."
                )
              }
            />
          </>
        )}
      </div>

      {/* Feedback messages — full width below buttons */}
      {(error || successMsg) && (
        <div className="w-full sm:col-span-full">
          {error && (
            <p className="text-xs text-warm-coral font-semibold leading-relaxed">
              ✕ {error}
            </p>
          )}
          {successMsg && !error && (
            <p className="text-xs text-tropical-green font-semibold leading-relaxed">
              ✓ {successMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared button primitive ───────────────────────────────────────────────────

type Variant = "green" | "neutral" | "subtle" | "danger";

const VARIANT_CLASS: Record<Variant, string> = {
  green:
    "bg-tropical-green/20 text-tropical-green hover:bg-tropical-green/35 border border-tropical-green/30",
  neutral:
    "bg-tiki-brown/8 text-tiki-brown/65 hover:bg-tiki-brown/15 border border-tiki-brown/15",
  subtle:
    "bg-white/70 text-tiki-brown/55 hover:bg-white border border-tiki-brown/12",
  danger:
    "bg-warm-coral/10 text-warm-coral/80 hover:bg-warm-coral/20 border border-warm-coral/20",
};

function ActionBtn({
  label,
  loadingLabel,
  loading,
  disabled,
  variant,
  onClick,
}: {
  label: string;
  loadingLabel: string;
  loading: boolean;
  disabled: boolean;
  variant: Variant;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-xs font-bold px-3.5 py-2 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${VARIANT_CLASS[variant]}`}
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
