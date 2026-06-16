import type { Metadata } from "next";
import Link from "next/link";
import { getAnimatedStoriesContent } from "@/lib/animatedStories";
import AnimatedStoriesManager from "./AnimatedStoriesManager";

export const metadata: Metadata = {
  title: "Animated Stories | Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminAnimatedStoriesPage() {
  const content = getAnimatedStoriesContent();

  return (
    <main className="min-h-screen bg-gradient-to-b from-tropical-green/8 to-white">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-20 flex flex-col gap-8">
        <div className="flex items-center gap-2 text-sm text-tiki-brown/50">
          <Link href="/admin" className="hover:text-tiki-brown transition-colors">
            Admin
          </Link>
          <span>/</span>
          <span className="text-tiki-brown font-semibold">Animated Stories</span>
        </div>

        <div>
          <h1 className="text-2xl font-black text-tiki-brown mb-1">
            🎬 Animated Stories
          </h1>
          <p className="text-sm text-tiki-brown/60">
            Create animated story titles and upload video clips that will play in order.
          </p>
        </div>

        <AnimatedStoriesManager initialContent={content} />
      </div>
    </main>
  );
}
