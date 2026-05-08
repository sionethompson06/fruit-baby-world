import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  type Character,
  type CharacterRelationship,
  type ColorSwatch,
} from "@/lib/content";
import {
  getPublicCharactersFromDisk,
  getPublicCharacterBySlugFromDisk,
} from "@/lib/characterContent";
import CharacterImage from "@/components/CharacterImage";
import ProfileSheetImage from "@/components/ProfileSheetImage";

export const dynamic = "force-dynamic";

// ─── Static params ────────────────────────────────────────────────────────────────────

export function generateStaticParams() {
  return getPublicCharactersFromDisk().map((c) => ({ slug: c.slug }));
}

// ─── Metadata ──────────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const character = getPublicCharacterBySlugFromDisk(slug);
  if (!character) return { title: "Not Found | Fruit Baby World" };
  return {
    title: `${character.name} | Fruit Baby World`,
    description: character.tagline || character.shortDescription,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────────

const emojiMap: Record<string, string> = {
  "pineapple-baby": "🍍",
  "ube-baby": "🫐",
  "mango-baby": "🥭",
  "kiwi-baby": "🥝",
  "coconut-baby": "🥥",
  tiki: "🗿",
};

function SectionCard({
  title,
  accentColor,
  children,
}: {
  title: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-tiki-brown/10 overflow-hidden">
      <div className="px-5 py-3" style={{ backgroundColor: `${accentColor}22` }}>
        <h2 className="text-xs font-black text-tiki-brown uppercase tracking-widest">
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function QuickFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
        {label}
      </dt>
      <dd className="text-sm text-tiki-brown/80">{value}</dd>
    </div>
  );
}

function isRelationshipObject(
  rel: unknown
): rel is CharacterRelationship {
  return typeof rel === "object" && rel !== null && "character" in rel;
}

function isColorSwatchObject(swatch: unknown): swatch is ColorSwatch {
  return typeof swatch === "object" && swatch !== null && "hex" in swatch;
}

// ─── Page ─────────────────────────────────────────────────────────────────────────────────

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const character = getPublicCharacterBySlugFromDisk(slug);
  if (!character) notFound();

  const char = character as Character;
  const emoji = emojiMap[char.id] ?? "✨";
  const isVillain = char.type === "villain";
  const accentColor = char.visualIdentity.primaryColors[0] ?? "#FFD84D";

  return (
    <div className="min-h-screen bg-bg-cream">
      {/* Back link */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <Link
          href="/characters"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-tiki-brown/60 hover:text-tiki-brown transition-colors"
        >
          ← Back to all characters
        </Link>
      </div>

      {/* Hero */}
      <section
        className="mt-4"
        style={{ background: `linear-gradient(160deg, ${accentColor}28 0%, transparent 70%)` }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex flex-col sm:flex-row gap-8 items-center sm:items-start">

            <CharacterImage
              src={char.image.main}
              alt={char.image.alt}
              emoji={emoji}
              bgColor={`${accentColor}40`}
              className="w-40 h-40 sm:w-48 sm:h-48 rounded-3xl shadow-lg flex-shrink-0 border-4 border-white"
            />

            <div className="flex flex-col gap-3 text-center sm:text-left flex-1">
              {isVillain ? (
                <span className="inline-flex items-center gap-1 bg-tiki-brown text-coconut-cream text-xs font-bold px-3 py-1 rounded-full w-fit mx-auto sm:mx-0">
                  ⚡ Mischievous Rival
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 bg-white/80 text-tiki-brown text-xs font-bold px-3 py-1 rounded-full w-fit mx-auto sm:mx-0 border border-tiki-brown/15">
                  🌟 Fruit Baby Universe
                </span>
              )}

              <h1 className="text-4xl sm:text-5xl font-black text-tiki-brown leading-tight">
                {char.name}
              </h1>

              {char.subtitle && (
                <p className="text-sm font-semibold text-tiki-brown/55">{char.subtitle}</p>
              )}

              <p className="text-base font-semibold text-tiki-brown/55">{char.role}</p>

              {char.tagline && (
                <p className="text-lg italic text-tiki-brown/70">&ldquo;{char.tagline}&rdquo;</p>
              )}

              <p className="text-sm text-tiki-brown/70 leading-relaxed max-w-xl">
                {char.shortDescription}
              </p>

              <div className="flex gap-2 justify-center sm:justify-start mt-1">
                {char.visualIdentity.primaryColors.map((color, i) => (
                  <div
                    key={i}
                    className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Official Character Profile Sheet */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-2">
        <div className="bg-white rounded-3xl shadow-sm border border-tiki-brown/10 overflow-hidden">
          <div className="px-5 py-3" style={{ backgroundColor: `${accentColor}22` }}>
            <h2 className="text-xs font-black text-tiki-brown uppercase tracking-widest">
              Official Character Profile
            </h2>
          </div>
          <div className="p-5 sm:p-8">
            <ProfileSheetImage
              src={char.image.profileSheet}
              alt={char.image.alt}
              accentColor={accentColor}
              characterName={char.name}
              slug={char.slug}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="lg:col-span-2 flex flex-col gap-6">

          {(char.about || char.storyRole || char.signatureStyle || char.brandPositioning) && (
            <SectionCard title="About" accentColor={accentColor}>
              <div className="flex flex-col gap-4">
                {char.about && <p className="text-sm text-tiki-brown/80 leading-relaxed">{char.about}</p>}
                {char.storyRole && (
                  <div>
                    <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">Story Role</p>
                    <p className="text-sm text-tiki-brown/75 leading-relaxed">{char.storyRole}</p>
                  </div>
                )}
                {char.rivalry && (
                  <div>
                    <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">Rivalry</p>
                    <p className="text-sm text-tiki-brown/75 leading-relaxed italic">{char.rivalry}</p>
                  </div>
                )}
                {char.signatureStyle && (
                  <div>
                    <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">Signature Style</p>
                    <p className="text-sm text-tiki-brown/75 leading-relaxed italic">{char.signatureStyle}</p>
                  </div>
                )}
                {char.brandPositioning && char.brandPositioning !== char.about && (
                  <div>
                    <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">Brand Positioning</p>
                    <p className="text-sm text-tiki-brown/75 leading-relaxed">{char.brandPositioning}</p>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {char.personality && char.personality.length > 0 && (
            <SectionCard title="Personality" accentColor={accentColor}>
              <div className="flex flex-col gap-2.5">
                {char.personality.map((trait, i) => {
                  const parts = trait.split(" — ");
                  const traitName = parts[0].trim();
                  const traitDesc = parts[1]?.trim();
                  return (
                    <div key={i} className="flex gap-2.5 items-start">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 mt-0.5 text-tiki-brown border border-tiki-brown/15" style={{ backgroundColor: `${accentColor}28` }}>
                        {traitName}
                      </span>
                      {traitDesc && <p className="text-sm text-tiki-brown/70 pt-0.5 leading-snug">{traitDesc}</p>}
                    </div>
                  );
                })}
              </div>
              {char.teaches && char.teaches.length > 0 && (
                <div className="mt-4 pt-4 border-t border-tiki-brown/10">
                  <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-2">Teaches</p>
                  <div className="flex flex-wrap gap-1.5">
                    {char.teaches.map((t, i) => (
                      <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-bg-cream text-tiki-brown border border-tiki-brown/15">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>
          )}

          {((char.likes && char.likes.length > 0) || (char.dislikes && char.dislikes.length > 0)) && (
            <SectionCard title="Likes &amp; Dislikes" accentColor={accentColor}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {char.likes && char.likes.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-tropical-green uppercase tracking-wide mb-2">Likes</p>
                    <ul className="flex flex-col gap-1.5">
                      {char.likes.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-tiki-brown/80">
                          <span className="text-tropical-green font-bold flex-shrink-0">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {char.dislikes && char.dislikes.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-warm-coral uppercase tracking-wide mb-2">Dislikes</p>
                    <ul className="flex flex-col gap-1.5">
                      {char.dislikes.map((item, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-tiki-brown/80">
                          <span className="text-warm-coral font-bold flex-shrink-0">✗</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {char.expressions && char.expressions.length > 0 && (
            <SectionCard title="Expressions" accentColor={accentColor}>
              <div className="flex flex-wrap gap-2">
                {char.expressions.map((expr, i) => (
                  <span key={i} className="text-sm font-semibold px-3 py-1.5 rounded-full text-tiki-brown border border-tiki-brown/15" style={{ backgroundColor: `${accentColor}1E` }}>
                    {expr}
                  </span>
                ))}
              </div>
            </SectionCard>
          )}

          {char.posesAndActions && char.posesAndActions.length > 0 && (
            <SectionCard title="Poses &amp; Actions" accentColor={accentColor}>
              <div className="flex flex-wrap gap-2">
                {char.posesAndActions.map((pose, i) => (
                  <span key={i} className="text-sm font-semibold px-3 py-1.5 rounded-full bg-bg-cream text-tiki-brown border border-tiki-brown/10">{pose}</span>
                ))}
              </div>
            </SectionCard>
          )}

          {char.relationships && char.relationships.length > 0 && (
            <SectionCard title="Relationships" accentColor={accentColor}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {char.relationships.map((rel, i) =>
                  isRelationshipObject(rel) ? (
                    <div key={i} className="flex flex-col bg-bg-cream rounded-2xl p-3 border border-tiki-brown/10">
                      <span className="font-bold text-tiki-brown text-sm">{rel.character}</span>
                      <span className="text-xs text-tiki-brown/55 mt-0.5">{rel.description}</span>
                    </div>
                  ) : (
                    <div key={i} className="text-sm text-tiki-brown/80 bg-bg-cream rounded-2xl p-3 border border-tiki-brown/10">{String(rel)}</div>
                  )
                )}
              </div>
            </SectionCard>
          )}

          {char.characterRules && (
            <SectionCard title="Character Rules" accentColor={accentColor}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {char.characterRules.always && char.characterRules.always.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-tropical-green uppercase tracking-wide mb-2">Always</p>
                    <ul className="flex flex-col gap-1.5">
                      {char.characterRules.always.map((rule, i) => (
                        <li key={i} className="flex gap-2 items-start text-sm text-tiki-brown/80">
                          <span className="text-tropical-green flex-shrink-0 mt-0.5 font-bold">✓</span>
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {char.characterRules.never && char.characterRules.never.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-warm-coral uppercase tracking-wide mb-2">Never</p>
                    <ul className="flex flex-col gap-1.5">
                      {char.characterRules.never.map((rule, i) => (
                        <li key={i} className="flex gap-2 items-start text-sm text-tiki-brown/80">
                          <span className="text-warm-coral flex-shrink-0 mt-0.5 font-bold">✗</span>
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </SectionCard>
          )}
        </div>

        <div className="flex flex-col gap-6">

          <SectionCard title="Quick Facts" accentColor={accentColor}>
            <dl className="flex flex-col gap-3">
              {char.fruitType && <QuickFact label="Fruit Type" value={char.fruitType} />}
              {char.home && <QuickFact label="Home" value={char.home} />}
              {char.birthday && <QuickFact label="Birthday" value={char.birthday} />}
              {char.favoriteQuote && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">Favorite Quote</dt>
                  <dd className="text-sm italic text-tiki-brown/75">&ldquo;{char.favoriteQuote}&rdquo;</dd>
                </div>
              )}
              {char.signatureQuote && (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">Signature Quote</dt>
                  <dd className="text-sm italic text-tiki-brown/75">&ldquo;{char.signatureQuote}&rdquo;</dd>
                </div>
              )}
              <QuickFact label="Type" value={char.type === "villain" ? "Mischievous Rival" : "Fruit Baby Friend"} />
            </dl>
          </SectionCard>

          <SectionCard title="Visual Identity" accentColor={accentColor}>
            {char.visualIdentity.palette && char.visualIdentity.palette.length > 0 ? (
              <div className="flex flex-col gap-2">
                {char.visualIdentity.palette.map((swatch, i) =>
                  isColorSwatchObject(swatch) ? (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex-shrink-0" style={{ backgroundColor: swatch.hex }} />
                      <span className="text-xs text-tiki-brown/80 flex-1">{swatch.name}</span>
                      <span className="text-xs text-tiki-brown/35 font-mono">{swatch.hex}</span>
                    </div>
                  ) : (
                    <div key={i} className="text-xs text-tiki-brown/70">{String(swatch)}</div>
                  )
                )}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {[...char.visualIdentity.primaryColors, ...char.visualIdentity.accentColors].map((color, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: color }} title={color} />
                ))}
              </div>
            )}
            {char.visualIdentity.styleNotes && (
              <p className="text-xs text-tiki-brown/60 leading-relaxed mt-4 pt-3 border-t border-tiki-brown/10">
                {char.visualIdentity.styleNotes}
              </p>
            )}
          </SectionCard>

          {char.catchphrases && char.catchphrases.length > 0 && (
            <SectionCard title="Catchphrases" accentColor={accentColor}>
              <div className="flex flex-col gap-2.5">
                {char.catchphrases.map((phrase, i) => (
                  <p key={i} className="text-sm italic text-tiki-brown/75 leading-snug">&ldquo;{phrase}&rdquo;</p>
                ))}
              </div>
            </SectionCard>
          )}

          {char.merchPotential && char.merchPotential.length > 0 && (
            <SectionCard title="Merch Potential" accentColor={accentColor}>
              <div className="flex flex-wrap gap-1.5">
                {char.merchPotential.map((item, i) => (
                  <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-bg-cream text-tiki-brown border border-tiki-brown/15 capitalize">{item}</span>
                ))}
              </div>
              {char.trademarkNotes && char.trademarkNotes.length > 0 && (
                <div className="mt-3 pt-3 border-t border-tiki-brown/10">
                  <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">Classification</p>
                  <ul className="flex flex-col gap-1">
                    {char.trademarkNotes.map((note, i) => (
                      <li key={i} className="text-xs text-tiki-brown/60">{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </SectionCard>
          )}
        </div>
      </div>

      {/* Brand callout */}
      <section className="bg-coconut-cream border-t border-pineapple-yellow/30 py-12 px-4 text-center">
        <div className="max-w-xl mx-auto flex flex-col items-center gap-4">
          <p className="text-sm font-semibold text-tiki-brown/65">
            ✨ Designed for animated stories, plushies, collectibles, and playful adventures.
          </p>
          <Link
            href="/characters"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-tiki-brown/70 hover:text-tiki-brown transition-colors"
          >
            ← Back to all characters
          </Link>
        </div>
      </section>
    </div>
  );
}
