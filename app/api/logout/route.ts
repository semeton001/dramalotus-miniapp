import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  getSessionTokenFromCookie,
  deleteSessionByToken,
  WEB_SESSION_COOKIE,
} from "@/lib/auth/session";

export async function POST() {
  const sessionToken = await getSessionTokenFromCookie();

  if (sessionToken) {
    try {
      await deleteSessionByToken(sessionToken);
    } catch {
      // Tetap lanjut clear cookie walau delete session gagal.
    }
  }

  const headerStore = await headers();
  const proto = headerStore.get("x-forwarded-proto") || "http";
  const host =
    headerStore.get("x-forwarded-host") ||
    headerStore.get("host") ||
    "localhost:3000";

  const response = NextResponse.redirect(`${proto}://${host}/login`);

  response.cookies.set(WEB_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
