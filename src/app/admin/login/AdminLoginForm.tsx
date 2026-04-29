"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  isConfigured: boolean;
  nextUrl: string;
}

export default function AdminLoginForm({ isConfigured, nextUrl }: Props) {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (data.ok) {
        router.push(nextUrl);
        router.refresh();
      } else {
        setError(data.message ?? "Incorrect passcode. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6">

        {/* Logo / brand */}
        <div className="text-center">
          <div className="text-5xl mb-3">🍍</div>
          <h1 className="text-2xl font-black text-tiki-brown">Fruit Baby Story Studio</h1>
          <p className="text-sm text-tiki-brown/55 mt-1">Private creative workspace</p>
        </div>

        {/* Card */}
        <div className="w-full bg-white rounded-3xl border border-tiki-brown/10 shadow-md p-7 flex flex-col gap-5">

          {!isConfigured ? (
            <div className="flex items-start gap-3 bg-pineapple-yellow/20 border border-pineapple-yellow/40 rounded-2xl px-4 py-3">
              <span className="text-lg flex-shrink-0">⚙️</span>
              <p className="text-sm text-tiki-brown/70 leading-relaxed">
                Admin passcode is not configured yet. Add{" "}
                <code className="font-mono text-xs bg-tiki-brown/8 px-1 py-0.5 rounded">
                  ADMIN_PASSCODE
                </code>{" "}
                in Vercel environment variables.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="passcode"
                  className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide"
                >
                  Studio Passcode
                </label>
                <input
                  id="passcode"
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder="Enter passcode"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-tiki-brown/20 bg-bg-cream px-4 py-3 text-sm text-tiki-brown placeholder-tiki-brown/30 focus:outline-none focus:ring-2 focus:ring-ube-purple/40 focus:border-ube-purple/50"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-warm-coral/15 border border-warm-coral/30 rounded-xl px-3 py-2.5">
                  <span className="text-sm flex-shrink-0">⚠️</span>
                  <p className="text-sm text-tiki-brown/80">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !passcode}
                className="w-full bg-ube-purple text-white font-bold text-sm py-3 rounded-xl shadow hover:bg-ube-purple/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Checking…" : "Unlock Studio"}
              </button>
            </form>
          )}
        </div>

        <p className="text-xs text-tiki-brown/35 text-center">
          Admin access only. Public site is available at{" "}
          <a href="/" className="underline hover:text-tiki-brown/60 transition-colors">
            fruitbabyworld.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
