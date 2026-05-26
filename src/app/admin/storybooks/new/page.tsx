import type { Metadata } from "next";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import StorybookCreateForm from "./StorybookCreateForm";

export const metadata: Metadata = {
  title: "Create New Storybook | Admin",
};

export default function NewStorybookPage() {
  let characterOptions: string[] = [];
  try {
    characterOptions = loadAllCharactersFromDisk().map((c) => c.name);
  } catch {
    characterOptions = [];
  }

  return <StorybookCreateForm characterOptions={characterOptions} />;
}
