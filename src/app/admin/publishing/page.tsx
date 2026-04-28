import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Publishing Queue | Story Studio",
};

const workflowStages = [
  {
    label: "Draft",
    emoji: "✏️",
    description: "Initial storyboard or episode concept — not yet reviewed.",
    color: "bg-tiki-brown/10 text-tiki-brown/60",
  },
  {
    label: "Needs Review",
    emoji: "🔍",
    description: "Submitted for character fidelity and content review.",
    color: "bg-pineapple-yellow/40 text-tiki-brown",
  },
  {
    label: "Approved",
    emoji: "✅",
    description: "Reviewed and approved. Ready for asset generation or saving.",
    color: "bg-tropical-green/20 text-tiki-brown",
  },
  {
    label: "Ready to Publish",
    emoji: "📦",
    description:
      "Assets generated and saved. Queued for live publishing to the website.",
    color: "bg-sky-blue/50 text-tiki-brown",
  },
  {
    label: "Published",
    emoji: "🚀",
    description: "Live on the public website.",
    color: "bg-ube-purple/20 text-ube-purple",
  },
];

export default function PublishingPage() {
  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">
      <section className="bg-gradient-to-b from-sky-blue/30 via-bg-cream to-bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-blue/50 text-tiki-brown uppercase tracking-widest">
              Planned
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Admin Only
            </span>
          </div>
          <div className="text-4xl mb-3">📤</div>
          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
            Publishing Queue
          </h1>
          <p className="text-tiki-brown/70 text-base leading-relaxed max-w-xl">
            Manage the full draft-to-published lifecycle for storyboards,
            episode packages, products, and generated assets.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col gap-6">

        {/* Not active notice */}
        <div className="flex items-start gap-3 bg-white border border-pineapple-yellow/40 rounded-2xl px-5 py-4 shadow-sm">
          <span className="text-xl flex-shrink-0">🏗️</span>
          <div>
            <p className="text-sm font-bold text-tiki-brown mb-0.5">
              Not active yet
            </p>
            <p className="text-sm text-tiki-brown/65 leading-relaxed">
              Status tracking and publishing controls will be built in a future
              phase. No status changes can be made on this page.
            </p>
          </div>
        </div>

        {/* Workflow stages */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-7">
          <h2 className="text-base font-black text-tiki-brown mb-5">
            Planned workflow stages
          </h2>
          <div className="flex flex-col gap-3">
            {workflowStages.map((stage, i) => (
              <div key={stage.label} className="flex items-start gap-3">
                <div className="flex flex-col items-center gap-1 pt-0.5">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${stage.color}`}
                  >
                    {stage.emoji} {stage.label}
                  </span>
                </div>
                <p className="text-sm text-tiki-brown/65 leading-snug pt-1">
                  {stage.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* What it will do */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-7">
          <h2 className="text-base font-black text-tiki-brown mb-4">
            What this will do later
          </h2>
          <ul className="space-y-3">
            {[
              "List all storyboards, episodes, and products with their current status",
              "Allow status changes: draft → needs review → approved → ready to publish → published",
              "Block publishing of unapproved character variations",
              "Show a publishing checklist before making content live",
              "Connect to GitHub Content Saver to commit approved content to the repo",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-tiki-brown/75 leading-snug"
              >
                <span className="text-sky-blue mt-0.5 flex-shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

      </section>
    </div>
  );
}
