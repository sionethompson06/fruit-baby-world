import type { Metadata } from "next";
import { getHomepageShowcaseConfig } from "@/lib/homepageShowcase";
import HomepageShowcaseEditor from "./HomepageShowcaseEditor";

export const metadata: Metadata = {
  title: "Homepage Showcase | Admin | Fruit Baby World",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminHomepagePage() {
  const config = getHomepageShowcaseConfig();
  return <HomepageShowcaseEditor initialConfig={config} />;
}
