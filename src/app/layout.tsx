import type { Metadata } from "next";
import { Geist, Geist_Mono, Bubblegum_Sans } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const bubblegumSans = Bubblegum_Sans({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bubblegum-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pineapple Baby",
  description:
    "A playful world of Pineapple Baby, storybook friends, animated stories, and collectible character adventures.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bubblegumSans.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">
        <Nav />
        <main className="flex-1">{children}</main>
        <footer className="bg-coconut-cream border-t border-pineapple-yellow/30 py-6 text-center text-sm text-tiki-brown/70">
          © {new Date().getFullYear()} Pineapple Baby™. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
