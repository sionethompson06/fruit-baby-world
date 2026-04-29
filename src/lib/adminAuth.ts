// Admin authentication helpers.
// Uses Web Crypto API (globalThis.crypto.subtle) so this module is safe to
// import from both the Edge middleware and Node.js API routes.

export const ADMIN_COOKIE = "fruit_baby_admin";

const SESSION_LABEL = "fruit-baby-admin-session-v1";

async function hmacToken(passcode: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(passcode),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await globalThis.crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(SESSION_LABEL)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Derives the expected cookie token from ADMIN_PASSCODE env var.
// Returns null if the env var is not configured.
export async function generateAdminToken(): Promise<string | null> {
  const passcode = process.env.ADMIN_PASSCODE;
  if (!passcode) return null;
  return hmacToken(passcode);
}

// Constant-time comparison to validate a cookie token.
export async function isValidAdminToken(
  token: string | undefined
): Promise<boolean> {
  if (!token) return false;
  const expected = await generateAdminToken();
  if (!expected) return false;
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
