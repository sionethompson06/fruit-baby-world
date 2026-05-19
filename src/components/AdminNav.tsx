"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const primaryLinks = [
  { href: "/admin", label: "Dashboard", emoji: "🏠" },
  { href: "/admin/characters", label: "Character Studio", emoji: "🍍" },
  { href: "/admin/episodes", label: "Story Studio", emoji: "🎬" },
  { href: "/admin/media", label: "Media Studio", emoji: "🎞️" },
  { href: "/admin/media-health", label: "Media Health", emoji: "🩺" },
  { href: "/admin/publishing", label: "Publishing", emoji: "📤" },
  { href: "/admin/products", label: "Product Studio", emoji: "🛍️" },
];

const advancedLinks = [
  { href: "/admin/storyboards", label: "Storyboards", emoji: "📝" },
  { href: "/admin/variations", label: "Variations", emoji: "🎨" },
  { href: "/admin/canon", label: "Canon", emoji: "🔒" },
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

          {/* Divider */}
          <span className="text-ube-purple/20 font-light mx-1 select-none hidden sm:block">|</span>

          {/* Advanced tools — muted */}
          <span className="text-[10px] font-bold text-ube-purple/35 uppercase tracking-widest pl-1 hidden sm:block whitespace-nowrap">
            Advanced:
          </span>
          {advancedLinks.map(({ href, label, emoji }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                isActive(href)
                  ? "bg-ube-purple/60 text-white shadow-sm"
                  : "text-ube-purple/50 hover:bg-ube-purple/12 hover:text-ube-purple/80"
              }`}
            >
              <span className="text-[10px]">{emoji}</span>
              <span>{label}</span>
            </Link>
          ))}

          {/* Lock */}
          <button
            onClick={handleLock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all text-warm-coral/70 hover:bg-warm-coral/10 hover:text-warm-coral ml-auto"
          >
            <span>🔒</span>
            <span>Lock Studio</span>
          </button>
        </div>

        {/* Mobile-only: advanced tools second row */}
        <div className="flex flex-wrap items-center gap-1 pb-2 sm:hidden">
          <span className="text-[10px] font-bold text-ube-purple/35 uppercase tracking-widest pr-1">
            Advanced:
          </span>
          {advancedLinks.map(({ href, label, emoji }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${
                isActive(href)
                  ? "bg-ube-purple/60 text-white shadow-sm"
                  : "text-ube-purple/45 hover:bg-ube-purple/12 hover:text-ube-purple/70"
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
