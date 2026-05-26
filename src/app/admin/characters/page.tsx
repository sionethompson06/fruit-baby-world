import type { Metadata } from "next";
import Link from "next/link";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import CreateCharacterDraftForm from "./CreateCharacterDraftForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Characters | Admin",
};

export default function AdminCharactersPage() {
  const characters = loadAllCharactersFromDisk();

  const published = characters.filter(
    (c) => c.approvalMode === "public" || (c.status === "active" && c.publicUseAllowed !== false)
  );
  const drafts = characters.filter(
    (c) => c.approvalMode === "draft" || c.status === "draft"
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-pineapple-yellow/10 to-white">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-20 flex flex-col gap-8">
        <div className="flex items-center gap-2 text-sm text-tiki-brown/50">
          <Link href="/admin" className="hover:text-tiki-brown transition-colors">Admin</Link>
          <span>/</span>
          <span className="text-tiki-brown font-semibold">Characters</span>
        </div>

        <div>
          <h1 className="text-2xl font-black text-tiki-brown mb-1">🍍 Characters</h1>
          <p className="text-sm text-tiki-brown/60">
            {characters.length} total — {published.length} published, {drafts.length} drafts
          </p>
        </div>

        {/* Published characters */}
        <section className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8">
          <h2 className="text-base font-black text-tiki-brown mb-4">Published Characters</h2>
          <div className="flex flex-col gap-3">
            {published.map((c) => (
              <div key={c.slug} className="flex items-center justify-between py-2 border-b border-tiki-brown/8 last:border-0">
                <div>
                  <p className="text-sm font-bold text-tiki-brown">{c.shortName ?? c.name}</p>
                  <p className="text-xs text-tiki-brown/45 font-mono">{c.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/characters/${c.slug}`}
                    target="_blank"
                    className="text-xs font-semibold text-ube-purple hover:text-ube-purple/80"
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))}
            {published.length === 0 && (
              <p className="text-sm text-tiki-brown/50">No published characters yet.</p>
            )}
          </div>
        </section>

        {/* Draft characters */}
        {drafts.length > 0 && (
          <section className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8">
            <h2 className="text-base font-black text-tiki-brown mb-4">Draft Characters</h2>
            <div className="flex flex-col gap-3">
              {drafts.map((c) => (
                <div key={c.slug} className="flex items-center justify-between py-2 border-b border-tiki-brown/8 last:border-0">
                  <div>
                    <p className="text-sm font-bold text-tiki-brown">{c.shortName ?? c.name}</p>
                    <p className="text-xs text-tiki-brown/45 font-mono">{c.slug}</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-tiki-brown/8 text-tiki-brown/50">
                    Draft
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Create character */}
        <section className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8">
          <h2 className="text-base font-black text-tiki-brown mb-2">➕ Create Character Draft</h2>
          <p className="text-xs text-tiki-brown/50 mb-5">
            Creates a new character JSON file. Character images are managed via the character JSON file.
          </p>
          <CreateCharacterDraftForm />
        </section>
      </div>
    </main>
  );
}
