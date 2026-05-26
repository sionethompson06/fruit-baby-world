import type { Metadata } from "next";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import CreateStorybookForm from "./CreateStorybookForm";

export const metadata: Metadata = {
  title: "Create New Storybook | Admin",
};

export default function NewStorybookPage() {
  let characterOptions: string[] = [];
  try {
    const chars = loadAllCharactersFromDisk();
    characterOptions = chars
      .map((c) => (typeof c.name === "string" ? c.name : c.slug))
      .filter(Boolean);
  } catch {
    characterOptions = [];
  }

  return <CreateStorybookForm characterOptions={characterOptions} />;
}
