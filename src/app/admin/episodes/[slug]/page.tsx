import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadEpisodeBySlug, type SavedEpisodeDraft } from "@/lib/savedEpisodes";
import { getEpisodeScenes, getActiveEpisodeScenes } from "@/lib/episodeScenes";
import PublishReadyAction from "./PublishReadyAction";
import { deriveMediaPlan, type MediaPlan, type PanelPlan, type ClipPlan } from "@/lib/episodeMediaPlan";
import PanelDraftGenerator from "./PanelDraftGenerator";
import AnimationRouteTestPanel, { type SceneOption } from "./AnimationRouteTestPanel";
import ReorderPanelsSection, { type PanelSummary } from "./ReorderPanelsSection";
import EditPanelCopySection from "./EditPanelCopySection";
import AddSceneSection from "./AddSceneSection";
import EditSceneSection, { type SceneForEdit } from "./EditSceneSection";
import ArchiveSceneSection, { type SceneForArchive } from "./ArchiveSceneSection";
import SceneIdStabilitySection from "./SceneIdStabilitySection";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import type { Character } from "@/lib/content";
import { isCharacterApprovedForAdminUse, characterHasPrimaryReference } from "@/lib/characterEligibility";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = loadEpisodeBySlug(slug);
  const title = result ? String(result.raw.title ?? slug) : slug;
  return { title: `${title.trim()} | Episode Studio` };
}

// ─── Safe field helpers ───────────────────────────────────────────────────────

function isRec(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function strArr(v: unknown): string[] {
  if (Array.isArray(v))
    return v
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  if (isRec(v)) {
    const inner = v.notes ?? v.text ?? v.content ?? v.value;
    if (typeof inner === "string" && inner.trim()) return [inner.trim()];
  }
  return [];
}

function recArr(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isRec);
}

// Detect if Tiki appears anywhere in the episode
function hasTiki(raw: Record<string, unknown>): boolean {
  return JSON.stringify(raw).toLowerCase().includes("tiki");
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

function ReviewBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    "draft":             { label: "Draft",             className: "bg-tiki-brown/10 text-tiki-brown/70" },
    "needs-review":      { label: "Needs Review",      className: "bg-pineapple-yellow/50 text-tiki-brown" },
    "approved-for-save": { label: "Approved for Save", className: "bg-tropical-green/20 text-tropical-green" },
    "revise":            { label: "Revise",            className: "bg-warm-coral/25 text-warm-coral" },
  };
  const meta = map[status] ?? { label: status, className: "bg-tiki-brown/10 text-tiki-brown/70" };
  return (
    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function Pill({
  children,
  className = "bg-tiki-brown/8 text-tiki-brown/60",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}