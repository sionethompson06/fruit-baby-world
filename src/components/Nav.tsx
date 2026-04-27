"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/characters", label: "Characters" },
  { href: "/stories", label: "Stories" },
  { href: "/shop", label: "Shop" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-coconut-cream/95 backdrop-blur-sm border-b border-pineapple-yellow/40 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-xl text-tiki-brown hover:opacity-80 transition-opacity"
        >
          <span className="text-2xl">🍍</span>
          <span>
            Fruit Baby{" "}
            <span className="text-ube-purple">World</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-all ${
                pathname === href
                  ? "bg-pineapple-yellow text-tiki-brown shadow-sm"
                  : "text-tiki-brown/80 hover:bg-pineapple-yellow/30 hover:text-tiki-brown"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
