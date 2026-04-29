import type { Metadata } from "next";
import AdminLoginForm from "./AdminLoginForm";

export const metadata: Metadata = {
  title: "Story Studio | Fruit Baby World",
};

function safeNext(raw: string | undefined): string {
  if (!raw) return "/admin";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/admin";
  return raw;
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const isConfigured = Boolean(process.env.ADMIN_PASSCODE);
  return (
    <AdminLoginForm isConfigured={isConfigured} nextUrl={safeNext(next)} />
  );
}
