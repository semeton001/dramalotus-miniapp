import crypto from "crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const WEB_SESSION_COOKIE = "web_session";
export const WEB_SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export type WebSession = {
  id: string;
  user_id: string;
  expires_at: string;
};

export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function getSessionExpiryDate() {
  return new Date(Date.now() + WEB_SESSION_TTL_MS);
}

export async function getSessionTokenFromCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(WEB_SESSION_COOKIE)?.value ?? null;
}

export async function createWebSession(userId: string) {
  const sessionToken = generateSessionToken();
  const expiresAt = getSessionExpiryDate();

  const { error } = await supabaseAdmin.from("web_sessions").insert({
    user_id: userId,
    session_token: sessionToken,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    sessionToken,
    expiresAt,
  };
}

export async function findValidSessionByToken(sessionToken: string) {
  const { data, error } = await supabaseAdmin
    .from("web_sessions")
    .select("id, user_id, expires_at")
    .eq("session_token", sessionToken)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as WebSession | null;
}

export async function deleteSessionByToken(sessionToken: string) {
  const { error } = await supabaseAdmin
    .from("web_sessions")
    .delete()
    .eq("session_token", sessionToken);

  if (error) {
    throw new Error(error.message);
  }
}

export async function clearInvalidSessionCookieIfNeeded() {
  const cookieStore = await cookies();
  const hasCookie = cookieStore.has(WEB_SESSION_COOKIE);

  if (!hasCookie) return;

  cookieStore.set(WEB_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}
