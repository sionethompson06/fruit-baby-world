import type { Metadata } from "next";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import StoryboardBuilder from "@/components/StoryboardBuilder";

export const metadata: Metadata = {
  title: "Storyboard Builder | Story Studio",
};

export default function StoryboardsPage() {
  let characters: import("@/lib/content").Character[] = [];
  try {
    characters = loadAllCharactersFromDisk();
  } catch { /* fallback to empty */ }
  return <StoryboardBuilder characters={characters} />;
}
