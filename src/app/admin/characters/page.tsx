import type { Metadata } from "next";
import { getAllCharacters } from "@/lib/content";

export const metadata: Metadata = {
  title: "Character Canon Library | Story Studio",
};

export default function AdminCharactersPage() {
  const characters = getAllCharacters();

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">
      <section className="bg-gradient-to-b from-pineapple-yellow/25 via-bg-cream to-bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-sky-blue/50 text-tiki-brown uppercase tracking-widest">
              Planned
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Admin Only
            </span>
          </div>
          <div className="text-4xl mb-3">📚</div>
          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
            Character Canon Library
          </h1>
          <p className="text-tiki-brown/70 text-base leading-relaxed max-w-xl">
            An admin reference view of canonical character data, official
            profile images, visual rules, personality guidelines, and
            character-fidelity guardrails.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col gap-6">

        {/* Live count */}
        <div className="bg-white rounded-2xl border border-tiki-brown/10 shadow-sm px-6 py-5 flex items-center gap-4">
          <span className="text-3xl">🍍</span>
          <div>
            <p className="text-2xl font-black text-tiki-brown">{characters.length}</p>
            <p className="text-xs font-semibold text-tiki-brown/50">
              characters in canonical JSON
            </p>
          </div>
        </div>

        {/* Not active notice */}
        <div className="flex items-start gap-3 bg-white border border-pineapple-yellow/40 rounded-2xl px-5 py-4 shadow-sm">
          <span className="text-xl flex-shrink-0">🏗️</span>
          <div>
            <p className="text-sm font-bold text-tiki-brown mb-0.5">
              Read-only planning shell
            </p>
            <p className="text-sm text-tiki-brown/65 leading-relaxed">
              The admin character reference view will be built in a future
              phase. Character data is managed via canonical JSON files. No
              editing is available here.
            </p>
          </div>
        </div>

        {/* Character list — read-only */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-7">
          <h2 className="text-base font-black text-tiki-brown mb-4">
            Canonical characters
          </h2>
          <div className="flex flex-col divide-y divide-tiki-brown/8">
            {characters.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-3 gap-3"
              >
                <div>
                  <p className="text-sm font-bold text-tiki-brown">{c.name}</p>
                  <p className="text-xs text-tiki-brown/50">{c.role}</p>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${
                    c.type === "villain"
                      ? "bg-warm-coral/20 text-tiki-brown"
                      : "bg-tropical-green/20 text-tiki-brown"
                  }`}
                >
                  {c.type === "villain" ? "Rival" : "Fruit Baby"}
                </span>
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
              "Display each character's full canonical profile alongside their official profile image",
              "Show color palettes, visual rules, personality notes, and brand guardrails",
              "Provide a quick-reference panel for writers and prompt builders",
              "Link to the variation generator with the correct character reference pre-loaded",
              "Flag any character data that is missing or incomplete",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-tiki-brown/75 leading-snug"
              >
                <span className="text-pineapple-yellow mt-0.5 flex-shrink-0">
                  •
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

      </section>
    </div>
  );
}
