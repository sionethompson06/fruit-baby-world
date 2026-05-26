"use client";

import { useState } from "react";

type ActionState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "success"; path: string; commitMessage: string; htmlUrl: string }
  | { type: "error"; message: string };

interface Props {
  slug: string;
  approvedForSave: boolean;
  isAlreadyPublished: boolean;
}

export default function PublishReadyAction({ slug, approvedForSave, isAlreadyPublished }: Props) {
  const [state, setState] = useState<ActionState>({ type: "idle" });

  const canAct = approvedForSave && !isAlreadyPublished;
  const isEnabled = canAct && state.type !== "loading";

  async function handleClick() {
    if (!isEnabled) return;

    const confirmed = window.confirm(
      "Are you sure you want to mark this episode public-ready?\n\nThis will update the episode JSON in GitHub."
    );
    if (!confirmed) return;

    setState({ type: "loading" });

    try {
      const res = await fetch("/api/github/mark-episode-public-ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ slug }),
      });

      const data = (await res.json()) as Record<string, unknown>;

      if (res.ok && data.ok === true) {
        setState({
          type: "success",
          path: typeof data.path === "string" ? data.path : "",
          commitMessage: typeof data.commitMessage === "string" ? data.commitMessage : "",
          htmlUrl: typeof data.htmlUrl === "string" ? data.htmlUrl : "",
        });
        return;
      }

      const status = typeof data.status === "string" ? data.status : "";
      const message = typeof data.message === "string" ? data.message : "An unexpected error occurred.";

      let displayMessage = message;
      if (status === "unauthorized") {
        displayMessage = "Admin access is required. Please unlock the Story Studio again.";
      } else if (status === "setup_required") {
        displayMessage =
          "GitHub publishing is not configured yet. Add GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, and GITHUB_BRANCH in Vercel environment variables.";
      }

      setState({ type: "error", message: displayMessage });
    } catch {
      setState({ type: "error", message: "Network error. Please check your connection and try again." });
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
      <h2 className="text-base font-black text-tiki-brown">Publish-Ready Action</h2>

      <p className="text-sm text-tiki-brown/70 leading-relaxed">
        Marking an episode public-ready updates its episode JSON in GitHub. After Vercel
        redeploys, the episode becomes eligible to appear on the public Stories page.
      </p>

      <div className="flex items-start gap-3 bg-pineapple-yellow/15 border border-pineapple-yellow/40 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">📋</span>
        <p className="text-sm text-tiki-brown/70 leading-relaxed">
          This does not create image or video assets. This does not edit the episode text.
          This only updates publishing metadata after review.
        </p>
      </div>

      {/* Not approved yet */}
      {!approvedForSave && (
        <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0">🔒</span>
          <p className="text-sm text-warm-coral leading-relaxed">
            Episode must be approved for save before it can be marked public-ready.
          </p>
        </div>
      )}

      {/* Already published */}
      {isAlreadyPublished && (
        <div className="flex items-center gap-2.5 bg-tropical-green/15 border border-tropical-green/30 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0">🟢</span>
          <p className="text-sm font-semibold text-tropical-green">
            This episode is already marked public-ready.
          </p>
        </div>
      )}

      {/* Success */}
      {state.type === "success" && (
        <div className="bg-tropical-green/10 border border-tropical-green/30 rounded-2xl p-4 flex flex-col gap-2">
          <p className="text-sm font-bold text-tropical-green">Episode marked public-ready.</p>
          {state.path && (
            <p className="text-xs font-mono text-tiki-brown/60">Updated: {state.path}</p>
          )}
          {state.commitMessage && (
            <p className="text-xs text-tiki-brown/60">Commit: {state.commitMessage}</p>
          )}
          {state.htmlUrl && (
            <a
              href={state.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-ube-purple underline"
            >
              View commit on GitHub →
            </a>
          )}
          <p className="text-xs text-tiki-brown/55 leading-relaxed mt-1">
            After Vercel redeploys, this episode should become eligible for the public Stories page.
          </p>
          <p className="text-xs text-tiki-brown/45 leading-relaxed">
            Because content is file-based, the public site updates after GitHub commit and Vercel
            redeploy.
          </p>
        </div>
      )}

      {/* Error */}
      {state.type === "error" && (
        <div className="bg-warm-coral/10 border border-warm-coral/30 rounded-2xl p-4">
          <p className="text-sm font-bold text-warm-coral mb-1">Action failed</p>
          <p className="text-sm text-tiki-brown/70 leading-relaxed">{state.message}</p>
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={!isEnabled}
        className={`self-start flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
          isEnabled
            ? "bg-tropical-green text-white hover:bg-tropical-green/85 shadow-sm cursor-pointer"
            : "bg-tiki-brown/10 text-tiki-brown/35 cursor-not-allowed"
        }`}
      >
        {state.type === "loading" ? (
          <>
            <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin inline-block" />
            Marking episode public-ready…
          </>
        ) : (
          "Mark Episode Public-Ready"
        )}
      </button>
    </div>
  );
}
