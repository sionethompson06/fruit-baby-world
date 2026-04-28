import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Episode Package Studio | Story Studio",
};

export default function EpisodesPage() {
  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">
      <section className="bg-gradient-to-b from-mango-orange/20 via-bg-cream to-bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-pineapple-yellow/40 text-tiki-brown uppercase tracking-widest">
              Coming Soon
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Admin Only
            </span>
          </div>
          <div className="text-4xl mb-3">🎬</div>
          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
            Episode Package Studio
          </h1>
          <p className="text-tiki-brown/70 text-base leading-relaxed max-w-xl">
            Turn approved storyboard prompts into complete, structured episode
            packages ready for animation, publishing, and merchandise planning.
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
              AI generation and episode package creation will be built in a
              future phase. No generation is active on this page.
            </p>
          </div>
        </div>

        {/* What it will do */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-7">
          <h2 className="text-base font-black text-tiki-brown mb-4">
            What this will do later
          </h2>
          <ul className="space-y-3">
            {[
              "Accept an approved storyboard as structured input",
              "Generate a complete episode summary and title",
              "Produce scene-by-scene scripts with dialogue and voiceover notes",
              "Generate image prompts for each scene, reference-anchored to official character art",
              "Generate animation prompts for each scene",
              "Suggest merchandise tie-in ideas based on the episode",
              "Output a structured episode JSON package ready for human review",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-tiki-brown/75 leading-snug"
              >
                <span className="text-mango-orange mt-0.5 flex-shrink-0">
                  •
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Future output placeholder */}
        <div className="bg-white rounded-3xl border border-dashed border-tiki-brown/20 p-7 text-center">
          <p className="text-3xl mb-3">⚙️</p>
          <p className="text-sm font-semibold text-tiki-brown/50">
            Episode package generator coming in a future phase
          </p>
        </div>

      </section>
    </div>
  );
}
