import type { Metadata } from "next";
import Link from "next/link";
import { getAllCharacters, type Character } from "@/lib/content";

export const metadata: Metadata = {
  title: "Character Canon Library | Story Studio",
};

// ─── Per-character visual fidelity notes ─────────────────────────────────────

const CHARACTER_FIDELITY: Record<string, string[]> = {
  "pineapple-baby": [
    "Preserve sunny yellow/golden body and green leafy crown.",
    "Maintain warm friendly face, rounded baby-like shape, and kind expression.",
  ],
  "ube-baby": [
    "Preserve purple/lavender ube identity and gentle dreamy expression.",
    "Cozy magical feeling, rounded baby-like shape.",
  ],
  "kiwi-baby": [
    "Preserve fuzzy kiwi-brown body, green kiwi top, leaf crown, and white blossom accent.",
    "Maintain warm eyes, blush, and sweet smile.",
  ],
  "coconut-baby": [
    "Preserve warm coconut-brown and cream identity and calm comforting expression.",
    "Rounded baby-like shape.",
  ],
  "mango-baby": [
    "Preserve mango yellow/orange identity and playful joyful expression.",
    "Tropical green leaf accents, energetic baby-like personality.",
  ],
  tiki: [
    "Preserve carved wooden tiki body, leafy green crown, and orange/red band.",
    "Mischievous kid-friendly expression — must remain funny, dramatic, sneaky, and kid-friendly.",
    "Do not make Tiki scary, violent, horror-like, cruel, evil, or too intense.",
  ],
};

const GLOBAL_FIDELITY_RULES = [
  "Official character profile images are the visual source of truth.",
  "Canonical character JSON is the data source of truth.",
  "Future generated images and videos must be reference-anchored.",
  "Characters must not be redesigned.",
  "Body shape, silhouette, proportions, facial style, colors, accessories, and fruit identity must be preserved.",
  "Generated media must remain kid-friendly.",
  "Public users should not freely generate or remix official characters.",
  "Human review is required before generated media is published.",
];

// ─── Layout primitives ────────────────────────────────────────────────────────

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

function StatusRow({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-tiki-brown/6 last:border-0">
      <dt className="text-xs text-tiki-brown/45 font-semibold">{label}</dt>
      <dd
        className={`text-xs font-bold ${
          positive === true
            ? "text-tropical-green"
            : positive === false
            ? "text-warm-coral/70"
            : "text-tiki-brown/65"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

// ─── Character reference card ─────────────────────────────────────────────────

function CharacterReferenceCard({ character }: { character: Character }) {
  const hasMain = Boolean(character.image.main);
  const hasProfileSheet = Boolean(character.image.profileSheet);
  const isTiki = character.type === "villain";
  const fidelityNotes = CHARACTER_FIDELITY[character.id] ?? [];

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm overflow-hidden">

      {/* Card header */}
      <div
        className={`px-6 py-5 border-b border-tiki-brown/8 ${
          isTiki ? "bg-warm-coral/6" : "bg-pineapple-yellow/8"
        }`}
      >
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Pill
                className={
                  isTiki
                    ? "bg-warm-coral/20 text-tiki-brown"
                    : "bg-tropical-green/15 text-tropical-green"
                }
              >
                {isTiki ? "Rival Character" : "Fruit Baby"}
              </Pill>
              <Pill className="bg-tiki-brown/8 text-tiki-brown/55">{character.status}</Pill>
            </div>
            <h2 className="text-xl font-black text-tiki-brown leading-tight">{character.name}</h2>
            {character.role && (
              <p className="text-xs text-tiki-brown/55 mt-0.5">{character.role}</p>
            )}
          </div>
          <Link
            href={`/characters/${character.slug}`}
            className="text-xs font-bold text-ube-purple hover:text-ube-purple/70 transition-colors whitespace-nowrap"
          >
            View Public Profile →
          </Link>
        </div>
        {character.tagline && (
          <p className="text-xs italic text-tiki-brown/50 mt-2">"{character.tagline}"</p>
        )}
      </div>

      <div className="p-6 flex flex-col gap-6">

        {/* Profile sheet — displayed full, object-contain, not cropped */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
            Official Profile Sheet Reference
          </p>
          {hasProfileSheet ? (
            <div className="border border-tiki-brown/10 rounded-2xl overflow-hidden bg-bg-cream p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={character.image.profileSheet!}
                alt={character.image.alt}
                className="w-full max-h-[28rem] object-contain"
              />
              <p className="text-xs text-tiki-brown/30 font-mono mt-2 text-center truncate">
                {character.image.profileSheet}
              </p>
            </div>
          ) : (
            <div className="border border-tiki-brown/10 rounded-2xl bg-tiki-brown/3 flex flex-col items-center justify-center h-36 gap-2">
              <span className="text-2xl select-none opacity-30">🖼️</span>
              <p className="text-xs font-bold text-tiki-brown/35 uppercase tracking-wide">
                Profile sheet not added yet
              </p>
            </div>
          )}
        </div>

        {/* Main image — if available */}
        {hasMain && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
              Isolated Main Image
            </p>
            <div className="border border-tiki-brown/10 rounded-2xl overflow-hidden bg-bg-cream p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={character.image.main}
                alt={character.image.alt}
                className="w-full max-h-60 object-contain"
              />
              <p className="text-xs text-tiki-brown/30 font-mono mt-2 text-center truncate">
                {character.image.main}
              </p>
            </div>
          </div>
        )}

        {/* Asset status */}
        <div>
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-2">
            Asset Status
          </p>
          <dl className="flex flex-col">
            <StatusRow label="Character JSON" value="Available" positive={true} />
            <StatusRow
              label="Profile Sheet"
              value={hasProfileSheet ? "Available" : "Missing"}
              positive={hasProfileSheet}
            />
            <StatusRow
              label="Main Image"
              value={hasMain ? "Available" : "Missing"}
              positive={hasMain}
            />
            <StatusRow
              label="Approved for Reference Use"
              value={hasProfileSheet ? "Yes" : "No — profile sheet needed"}
              positive={hasProfileSheet}
            />
            <StatusRow
              label="Isolated Media-Ready Image"
              value={hasMain ? "Yes" : "No — main image needed"}
              positive={hasMain}
            />
          </dl>
        </div>

        {/* Visual identity */}
        {character.visualIdentity?.styleNotes && (
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">
              Visual Identity
            </p>
            <p className="text-sm text-tiki-brown/70 leading-relaxed">
              {character.visualIdentity.styleNotes}
            </p>
            {character.visualIdentity.palette && character.visualIdentity.palette.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {character.visualIdentity.palette.map((swatch) => (
                  <div key={swatch.hex} className="flex items-center gap-1.5">
                    <div
                      className="w-4 h-4 rounded-full border border-tiki-brown/15 flex-shrink-0"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span className="text-xs text-tiki-brown/50 font-mono">{swatch.hex}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Personality */}
        {character.personality?.length > 0 && (
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">
              Personality
            </p>
            <div className="flex flex-wrap gap-1.5">
              {character.personality.map((trait) => (
                <span
                  key={trait}
                  className="text-xs px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple font-semibold"
                >
                  {trait}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Expressions */}
        {character.expressions && character.expressions.length > 0 && (
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">
              Expressions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {character.expressions.map((expr) => (
                <span
                  key={expr}
                  className="text-xs px-2.5 py-0.5 rounded-full bg-sky-blue/20 text-tiki-brown/65 font-semibold"
                >
                  {expr}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {character.shortDescription && (
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">
              Description
            </p>
            <p className="text-sm text-tiki-brown/70 leading-relaxed">
              {character.shortDescription}
            </p>
          </div>
        )}

        {/* Character rules */}
        <div className="grid gap-3 sm:grid-cols-2">
          {character.characterRules.always.length > 0 && (
            <div className="bg-tropical-green/6 border border-tropical-green/15 rounded-xl p-4">
              <p className="text-xs font-bold text-tropical-green/80 uppercase tracking-wide mb-2">
                Always
              </p>
              <ul className="space-y-1">
                {character.characterRules.always.map((rule) => (
                  <li
                    key={rule}
                    className="flex items-start gap-2 text-xs text-tiki-brown/65 leading-relaxed"
                  >
                    <span className="flex-shrink-0 text-tropical-green/60 mt-0.5">✓</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {character.characterRules.never.length > 0 && (
            <div className="bg-warm-coral/6 border border-warm-coral/15 rounded-xl p-4">
              <p className="text-xs font-bold text-warm-coral/80 uppercase tracking-wide mb-2">
                Never
              </p>
              <ul className="space-y-1">
                {character.characterRules.never.map((rule) => (
                  <li
                    key={rule}
                    className="flex items-start gap-2 text-xs text-tiki-brown/65 leading-relaxed"
                  >
                    <span className="flex-shrink-0 text-warm-coral/60 mt-0.5">✕</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Visual fidelity reminder */}
        {fidelityNotes.length > 0 && (
          <div className="bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl p-4">
            <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide mb-2">
              Visual Fidelity Reminder
            </p>
            <ul className="space-y-1">
              {fidelityNotes.map((note) => (
                <li
                  key={note}
                  className="flex items-start gap-2 text-xs text-tiki-brown/70 leading-relaxed"
                >
                  <span className="flex-shrink-0 text-pineapple-yellow/70 mt-0.5">•</span>
                  {note}
                </li>
              ))}
            </ul>
            {isTiki && (
              <div className="mt-3 flex items-start gap-2 bg-warm-coral/10 border border-warm-coral/20 rounded-lg px-3 py-2">
                <span className="text-sm flex-shrink-0">⚡</span>
                <p className="text-xs text-tiki-brown/70 leading-relaxed">
                  <strong className="font-bold">Tiki Trouble guardrail:</strong> Must remain
                  mischievous, funny, dramatic, and kid-friendly. Do not make Tiki scary, violent,
                  horror-like, cruel, evil, or too intense in any generated media.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Future generation readiness */}
        <div>
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-2">
            Future Generation Readiness
          </p>
          <dl className="flex flex-col">
            <StatusRow label="Story Panel Prompts" value="Yes — use scene data" positive={true} />
            <StatusRow label="Animation Prompts" value="Yes — use scene data" positive={true} />
            <StatusRow
              label="Requires Official Image References"
              value="Yes"
              positive={true}
            />
            <StatusRow
              label="Public Variation Generation"
              value="Not Allowed"
              positive={false}
            />
            <StatusRow label="Admin Approval Required" value="Yes" positive={true} />
          </dl>
        </div>

        {/* Signature quote */}
        {(character.signatureQuote || character.favoriteQuote) && (
          <div className="text-center px-2 pt-1">
            <p className="text-sm italic text-tiki-brown/50 leading-relaxed">
              "{character.signatureQuote ?? character.favoriteQuote}"
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCharactersPage() {
  const characters = getAllCharacters();

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* Header */}
      <section className="bg-gradient-to-b from-pineapple-yellow/25 via-bg-cream to-bg-cream py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Admin Only
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-tiki-brown/10 text-tiki-brown/60 uppercase tracking-widest">
              Read-Only
            </span>
          </div>
          <div className="text-4xl mb-3">📚</div>
          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
            Character Canon Library
          </h1>
          <p className="text-tiki-brown/70 text-base leading-relaxed max-w-xl">
            Review official Fruit Baby character data, profile images, visual rules, and reference
            assets for future media generation.
          </p>
        </div>
      </section>

      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 pb-16 flex flex-col gap-6">

        {/* Read-only notice */}
        <div className="flex items-start gap-3 bg-white border border-pineapple-yellow/40 rounded-2xl px-5 py-4 shadow-sm">
          <span className="text-xl flex-shrink-0">📋</span>
          <p className="text-sm text-tiki-brown/65 leading-relaxed">
            <strong className="text-tiki-brown font-bold">Read-only. </strong>
            Character editing, image generation, variation generation, and asset uploads are not
            active yet. Official character canon is managed via JSON files.
          </p>
        </div>

        {/* Summary stats */}
        <div className="flex flex-wrap gap-3">
          {(
            [
              ["Characters", String(characters.length)],
              [
                "Fruit Babies",
                String(characters.filter((c) => c.type === "fruit-baby").length),
              ],
              [
                "Rival Characters",
                String(characters.filter((c) => c.type === "villain").length),
              ],
              [
                "Profile Sheets",
                String(characters.filter((c) => c.image.profileSheet).length),
              ],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col items-center gap-0.5 bg-white border border-tiki-brown/10 rounded-2xl px-5 py-3 min-w-[7rem] text-center shadow-sm"
            >
              <span className="text-xl font-black text-tiki-brown">{value}</span>
              <span className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide leading-tight">
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Character reference cards — one per character */}
        {characters.map((character) => (
          <CharacterReferenceCard key={character.id} character={character} />
        ))}

        {/* Global character fidelity rules */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔒</span>
            <h2 className="text-base font-black text-tiki-brown">
              Global Character Fidelity Rules
            </h2>
          </div>
          <ul className="space-y-2">
            {GLOBAL_FIDELITY_RULES.map((rule) => (
              <li
                key={rule}
                className="flex items-start gap-2.5 text-sm text-tiki-brown/70 leading-relaxed"
              >
                <span className="flex-shrink-0 text-ube-purple/60 mt-0.5">•</span>
                {rule}
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 bg-warm-coral/8 border border-warm-coral/20 rounded-xl px-4 py-3">
            <span className="text-base flex-shrink-0">⚡</span>
            <p className="text-sm text-tiki-brown/70 leading-relaxed">
              <strong className="font-bold">Tiki Trouble:</strong> Must remain mischievous, funny,
              dramatic, and kid-friendly in all generated media. Never scary, violent, horror-like,
              cruel, evil, or too intense.
            </p>
          </div>
        </div>

        {/* Future use */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
          <h2 className="text-base font-black text-tiki-brown">Future Use</h2>
          <ul className="space-y-2">
            {[
              "These references will later support story panel generation using official profile images.",
              "These references will later support animation clip generation with character-anchored prompts.",
              "These references will later support admin-only character variation generation.",
              "No generation tools are active on this page yet.",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-tiki-brown/70 leading-relaxed"
              >
                <span className="flex-shrink-0 text-tropical-green/60 mt-0.5">•</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="flex items-start gap-3 bg-tiki-brown/4 rounded-xl px-4 py-3">
            <span className="text-base flex-shrink-0">🎨</span>
            <p className="text-sm text-tiki-brown/65 leading-relaxed">
              Future character variation tools will live in{" "}
              <Link
                href="/admin/variations"
                className="font-bold text-ube-purple hover:text-ube-purple/70 transition-colors"
              >
                /admin/variations
              </Link>
              . Variation generation is not active yet.
            </p>
          </div>
        </div>

      </section>
    </div>
  );
}
