import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

const TEMP_VIP_USER_IDS = new Set([
  "6536406815",
  "2046400681",
]);

function normalizeTelegramUserId(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

function normalizeVipUntil(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser || !currentUser.telegram_user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawTelegramUserId = request.nextUrl.searchParams.get("telegram_user_id");
    const requestedTelegramUserId = normalizeTelegramUserId(rawTelegramUserId);
    const telegramUserId = requestedTelegramUserId ?? currentUser.telegram_user_id;

    if (telegramUserId !== currentUser.telegram_user_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .select("telegram_user_id, membership_status, vip_until")
      .eq("telegram_user_id", telegramUserId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    let membership_status: "free" | "vip" =
      data?.membership_status === "vip" ? "vip" : "free";

    let vip_until = normalizeVipUntil(data?.vip_until);

    if (!data && TEMP_VIP_USER_IDS.has(String(telegramUserId))) {
      membership_status = "vip";
      vip_until = null;
    }

    if (vip_until) {
      const expiresAt = new Date(vip_until).getTime();
      if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
        membership_status = "free";
        vip_until = null;
      }
    }

    if (membership_status !== "vip") {
      vip_until = null;
    }

    return NextResponse.json({
      telegram_user_id: String(telegramUserId),
      membership_status,
      vip_until,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
