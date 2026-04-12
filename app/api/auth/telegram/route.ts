import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { verifyTelegramAuth } from "@/lib/auth/telegram";
import {
  createWebSession,
  WEB_SESSION_COOKIE,
} from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

type TelegramAuthPayload = {
  id: string | number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string | number;
  hash: string;
};

function normalizePayload(input: TelegramAuthPayload) {
  return {
    id: String(input.id ?? ""),
    first_name: input.first_name ?? "",
    last_name: input.last_name ?? "",
    username: input.username ?? "",
    photo_url: input.photo_url ?? "",
    auth_date: String(input.auth_date ?? ""),
    hash: input.hash ?? "",
  };
}

async function upsertTelegramUser(body: ReturnType<typeof normalizePayload>) {
  const telegramUserId = Number(body.id);

  const { data: existingUser, error: findError } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("telegram_user_id", telegramUserId)
    .maybeSingle();

  if (findError) {
    throw new Error(findError.message);
  }

  if (existingUser) {
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        telegram_username: body.username || null,
        first_name: body.first_name || null,
        last_name: body.last_name || null,
      })
      .eq("id", existingUser.id)
      .select("id")
      .single();

    if (updateError) {
      throw new Error(updateError.message);
    }

    return updatedUser.id as string;
  }

  const { data: newUser, error: insertError } = await supabaseAdmin
    .from("users")
    .insert({
      telegram_user_id: telegramUserId,
      telegram_username: body.username || null,
      first_name: body.first_name || null,
      last_name: body.last_name || null,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  return newUser.id as string;
}

async function handleAuth(payload: TelegramAuthPayload, requestUrl: string) {
  const body = normalizePayload(payload);

  const isValid = verifyTelegramAuth(body, process.env.TELEGRAM_BOT_TOKEN || "");

  if (!isValid) {
    return NextResponse.json({ error: "Invalid Telegram auth" }, { status: 401 });
  }

  const userId = await upsertTelegramUser(body);
  const { sessionToken, expiresAt } = await createWebSession(userId);

  const headerStore = await headers();
  const proto = headerStore.get("x-forwarded-proto") || "http";
  const host =
    headerStore.get("x-forwarded-host") ||
    headerStore.get("host") ||
    new URL(requestUrl).host;

  const response = NextResponse.redirect(`${proto}://${host}/me`);

  response.cookies.set(WEB_SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return response;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    return await handleAuth(
      {
        id: searchParams.get("id") ?? "",
        first_name: searchParams.get("first_name") ?? "",
        last_name: searchParams.get("last_name") ?? "",
        username: searchParams.get("username") ?? "",
        photo_url: searchParams.get("photo_url") ?? "",
        auth_date: searchParams.get("auth_date") ?? "",
        hash: searchParams.get("hash") ?? "",
      },
      req.url
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as TelegramAuthPayload;
    return await handleAuth(payload, req.url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
