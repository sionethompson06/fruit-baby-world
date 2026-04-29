import { NextResponse } from "next/server";
import { ADMIN_COOKIE, generateAdminToken } from "@/lib/adminAuth";

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (!process.env.ADMIN_PASSCODE) {
    return NextResponse.json(
      {
        ok: false,
        message:
          "Admin passcode is not configured yet. Add ADMIN_PASSCODE in Vercel environment variables.",
      },
      { status: 503 }
    );
  }

  const passcode =
    typeof body === "object" &&
    body !== null &&
    "passcode" in body &&
    typeof (body as Record<string, unknown>).passcode === "string"
      ? (body as Record<string, unknown>).passcode as string
      : null;

  if (!passcode || passcode !== process.env.ADMIN_PASSCODE) {
    return NextResponse.json(
      { ok: false, message: "Incorrect passcode. Please try again." },
      { status: 401 }
    );
  }

  const token = await generateAdminToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: ADMIN_COOKIE,
    value: token!,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return response;
}
