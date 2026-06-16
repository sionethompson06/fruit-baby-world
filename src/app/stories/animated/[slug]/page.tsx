import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCoverPageSettings, isCoverPageEnabled } from "@/lib/coverPage";
import CoverPage from "@/components/cover/CoverPage";
import {
  getPublicAnimatedStoryBySlug,
  getPublicAnimatedStoryClips,
} from "@/lib/animatedStories";
import AnimatedStoryViewer from "./AnimatedStoryViewer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = getPublicAnimatedStoryBySlug(slug);
  if (!story) return {};
  return {
    title: `${story.title} | Pineapple Baby Stories`,
    ...(story.description ? { description: story.description } : {}),
  };
}

export default async function AnimatedStoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const coverSettings = getCoverPageSettings();
  if (isCoverPageEnabled(coverSettings)) return <CoverPage settings={coverSettings} />;

  const { slug } = await params;
  const story = getPublicAnimatedStoryBySlug(slug);
  if (!story) notFound();

  const clips = getPublicAnimatedStoryClips(story);
  if (clips.length === 0) notFound();

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* Hero */}
      <section className="bg-gradient-to-b from-ube-purple/20 via-bg-cream to-bg-cream py-10 px-4">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">
          <Link
            href="/stories"
            className="self-start inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors"
          >
            ← Back to Stories
          </Link>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/12 text-ube-purple uppercase tracking-widest">
              Animated Story
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-tiki-brown/8 text-tiki-brown/60 uppercase tracking-widest">
              {clips.length} {clips.length === 1 ? "clip" : "clips"}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown leading-tight">
            {story.title}
          </h1>

          {story.description && (
            <p className="text-tiki-brown/65 text-base leading-relaxed max-w-xl">
              {story.description}
            </p>
          )}
        </div>
      </section>

      {/* Viewer */}
      <section className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <AnimatedStoryViewer story={story} clips={clips} />
      </section>

    </div>
  );
}
