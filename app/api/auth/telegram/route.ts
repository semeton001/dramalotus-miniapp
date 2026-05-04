import { headers } from "next/headers";
import { NextResponse } from "next/server";
import {
  parseTelegramInitData,
  verifyTelegramAuth,
  verifyTelegramWebAppInitData,
} from "@/lib/auth/telegram";
import {
  createWebSession,
  WEB_SESSION_COOKIE,
} from "@/lib/auth/session";
import { supabaseAdmin } from "@/lib/supabase/admin";

type TelegramAuthPayload = {
  id?: string | number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date?: string | number;
  hash?: string;
  init_data?: string;
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

function normalizeInitDataPayload(initData: string) {
  const parsed = parseTelegramInitData(initData);
  const rawUser = parsed.user ? JSON.parse(parsed.user) : {};

  return normalizePayload({
    id: rawUser?.id ?? "",
    first_name: rawUser?.first_name ?? "",
    last_name: rawUser?.last_name ?? "",
    username: rawUser?.username ?? "",
    photo_url: rawUser?.photo_url ?? "",
    auth_date: parsed.auth_date ?? "",
    hash: parsed.hash ?? "",
  });
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

async function handleAuth(
  payload: TelegramAuthPayload,
  requestUrl: string,
  responseMode: "redirect" | "json" = "redirect",
) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
  const initData =
    typeof payload.init_data === "string" && payload.init_data.trim().length > 0
      ? payload.init_data.trim()
      : "";

  const body = initData ? normalizeInitDataPayload(initData) : normalizePayload(payload);

  const isValid = initData
    ? verifyTelegramWebAppInitData(initData, botToken)
    : verifyTelegramAuth(body, botToken);

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

  const response =
    responseMode === "json"
      ? NextResponse.json({ ok: true, userId })
      : NextResponse.redirect(`${proto}://${host}/`);

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
    const responseMode =
      typeof payload.init_data === "string" && payload.init_data.trim()
        ? "json"
        : "redirect";

    return await handleAuth(payload, req.url, responseMode);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
