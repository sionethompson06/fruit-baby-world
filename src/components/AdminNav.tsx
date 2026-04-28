"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminLinks = [
  { href: "/admin", label: "Studio Home", emoji: "🏠" },
  { href: "/admin/storyboards", label: "Storyboards", emoji: "📝" },
  { href: "/admin/episodes", label: "Episodes", emoji: "🎬" },
  { href: "/admin/characters", label: "Characters", emoji: "🍍" },
  { href: "/admin/products", label: "Products", emoji: "🛍️" },
  { href: "/admin/canon", label: "Canon", emoji: "🔒" },
  { href: "/admin/publishing", label: "Publishing", emoji: "📤" },
  { href: "/admin/variations", label: "Variations", emoji: "🎨" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="bg-ube-purple/10 border-b border-ube-purple/20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 overflow-x-auto">
        <div className="flex items-center gap-1 py-2 min-w-max">
          {adminLinks.map(({ href, label, emoji }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                pathname === href
                  ? "bg-ube-purple text-white shadow-sm"
                  : "text-ube-purple/80 hover:bg-ube-purple/15 hover:text-ube-purple"
              }`}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
