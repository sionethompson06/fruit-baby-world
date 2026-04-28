import type { Metadata } from "next";
import { getAllCharacters } from "@/lib/content";
import StoryboardBuilder from "@/components/StoryboardBuilder";

export const metadata: Metadata = {
  title: "Storyboard Builder | Story Studio",
};

export default function StoryboardsPage() {
  const characters = getAllCharacters();
  return <StoryboardBuilder characters={characters} />;
}
