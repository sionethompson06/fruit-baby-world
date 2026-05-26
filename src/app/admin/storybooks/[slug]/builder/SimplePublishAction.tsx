"use client";

import { useState } from "react";
import Link from "next/link";

type PublishState =
  | { phase: "idle" }
  | { phase: "publishing" }
  | { phase: "done" }
  | { phase: "error"; message: string };

export default function SimplePublishAction({
  slug,
  approvedForSave,
  isAlreadyPublished,
}: {
  slug: string;
  approvedForSave: boolean;
  isAlreadyPublished: boolean;
}) {
  const [state, setState] = useState<PublishState>({ phase: "idle" });

  async function handlePublish() {
    setState({ phase: "publishing" });
    try {
      const res = await fetch("/api/github/mark-episode-public-ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!data.ok) {
        setState({ phase: "error", message: data.message ?? "Failed to publish." });
        return;
      }
      setState({ phase: "done" });
    } catch {
      setState({ phase: "error", message: "Network error. Please try again." });
    }
  }

  if (isAlreadyPublished || state.phase === "done") {
    return (
      <div className="flex items-center gap-3 bg-tropical-green/10 border border-tropical-green/25 rounded-2xl px-5 py-4">
        <span className="text-xl">✅</span>
        <div>
          <p className="text-sm font-bold text-tropical-green">Published</p>
          <p className="text-xs text-tiki-brown/55 mt-0.5">
            This storybook is live at{" "}
            <a
              href={`/stories/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors"
            >
              /stories/{slug} ↗
            </a>
          </p>
        </div>
      </div>
    );
  }

  if (!approvedForSave) {
    return (
      <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="text-xl flex-shrink-0">🔒</span>
          <div>
            <p className="text-sm font-bold text-tiki-brown">Review Approval Required</p>
            <p className="text-sm text-tiki-brown/60 leading-relaxed mt-1">
              Before publishing, this storybook needs to be approved for save in the legacy editor.
              Open the legacy editor, complete the review step, then return here to publish.
            </p>
          </div>
        </div>
        <Link
          href={`/admin/episodes/${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/15 hover:text-tiki-brown transition-colors w-fit"
        >
          Open Legacy Editor →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <span className="text-xl flex-shrink-0">🚀</span>
        <div>
          <p className="text-sm font-bold text-tiki-brown">Ready to Publish</p>
          <p className="text-sm text-tiki-brown/60 leading-relaxed mt-1">
            This storybook is approved and ready to go live. Publishing will make it visible on the public site.
          </p>
        </div>
      </div>

      {state.phase === "error" && (
        <div className="flex items-start gap-2 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-3 py-2">
          <span className="text-warm-coral font-bold text-sm flex-shrink-0">!</span>
          <p className="text-xs text-warm-coral">{state.message}</p>
        </div>
      )}

      <button
        onClick={handlePublish}
        disabled={state.phase === "publishing"}
        className="inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-2xl bg-tropical-green text-white hover:bg-tropical-green/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm w-fit"
      >
        {state.phase === "publishing" ? (
          <span className="animate-pulse">Publishing…</span>
        ) : (
          <>
            <span>🚀</span>
            Publish Storybook
          </>
        )}
      </button>
    </div>
  );
}
