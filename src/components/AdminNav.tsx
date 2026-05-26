"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const primaryLinks = [
  { href: "/admin", label: "Dashboard", emoji: "🏠" },
  { href: "/admin/episodes", label: "Storybooks", emoji: "📚" },
  { href: "/admin/characters", label: "Characters", emoji: "🍍" },
  { href: "/admin/media", label: "Media", emoji: "🎞️" },
  { href: "/admin/publishing", label: "Publish", emoji: "📤" },
];

const legacyLinks = [
  { href: "/admin/storyboards", label: "Storyboards", emoji: "📝" },
  { href: "/admin/variations", label: "Variations", emoji: "🎨" },
  { href: "/admin/canon", label: "Canon", emoji: "🔒" },
  { href: "/admin/media-health", label: "Media Health", emoji: "🩺" },
  { href: "/admin/products", label: "Products", emoji: "🛍️" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLock() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav className="bg-ube-purple/10 border-b border-ube-purple/20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Primary nav row */}
        <div className="flex flex-wrap items-center gap-1 py-2">
          {primaryLinks.map(({ href, label, emoji }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isActive(href)
                  ? "bg-ube-purple text-white shadow-sm"
                  : "text-ube-purple/80 hover:bg-ube-purple/15 hover:text-ube-purple"
              }`}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </Link>
          ))}

          {/* Lock */}
          <button
            onClick={handleLock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all text-warm-coral/70 hover:bg-warm-coral/10 hover:text-warm-coral ml-auto"
          >
            <span>🔒</span>
            <span className="hidden sm:inline">Lock</span>
          </button>
        </div>

        {/* Legacy tools — muted secondary row (desktop only) */}
        <div className="hidden sm:flex flex-wrap items-center gap-1 pb-2">
          <span className="text-[10px] font-bold text-ube-purple/30 uppercase tracking-widest px-1 select-none">
            Developer / Legacy:
          </span>
          {legacyLinks.map(({ href, label, emoji }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                isActive(href)
                  ? "bg-ube-purple/40 text-ube-purple shadow-sm"
                  : "text-ube-purple/40 hover:bg-ube-purple/10 hover:text-ube-purple/60"
              }`}
            >
              <span className="text-[10px]">{emoji}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>

      </div>
    </nav>
  );
}
