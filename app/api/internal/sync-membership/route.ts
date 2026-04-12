import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type SyncMembershipPayload = {
  telegram_user_id?: number | string;
  membership_status?: "free" | "vip" | string;
  telegram_username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  source?: string | null;
};

function getSyncSecretFromRequest(request: Request) {
  return (
    request.headers.get("x-sync-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  );
}

function getExpectedSyncSecret() {
  return process.env.SYNC_MEMBERSHIP_SECRET || process.env.DEBUG_ADMIN_SECRET || "";
}

function normalizeMembershipStatus(value: unknown): "free" | "vip" | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "free" || normalized === "vip") return normalized;
  return null;
}

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeTelegramUserId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.trim());
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const providedSecret = getSyncSecretFromRequest(request);
    const expectedSecret = getExpectedSyncSecret();

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as SyncMembershipPayload;
    const telegramUserId = normalizeTelegramUserId(body.telegram_user_id);
    const membershipStatus = normalizeMembershipStatus(body.membership_status);
    const source = normalizeOptionalString(body.source) || "unknown";

    if (!telegramUserId) {
      return NextResponse.json({ ok: false, error: "telegram_user_id is required" }, { status: 400 });
    }

    if (!membershipStatus) {
      return NextResponse.json(
        { ok: false, error: "membership_status must be 'free' or 'vip'" },
        { status: 400 }
      );
    }

    const previousResult = await supabaseAdmin
      .from("users")
      .select("id, telegram_user_id, membership_status, telegram_username, first_name, last_name")
      .eq("telegram_user_id", telegramUserId)
      .maybeSingle();

    if (previousResult.error) throw new Error(previousResult.error.message);

    const payload = {
      telegram_user_id: telegramUserId,
      membership_status: membershipStatus,
      telegram_username: normalizeOptionalString(body.telegram_username),
      first_name: normalizeOptionalString(body.first_name),
      last_name: normalizeOptionalString(body.last_name),
    };

    const { data, error } = await supabaseAdmin
      .from("users")
      .upsert(payload, { onConflict: "telegram_user_id" })
      .select("id, telegram_user_id, membership_status, telegram_username, first_name, last_name")
      .single();

    if (error || !data) throw new Error(error?.message || "Failed to sync membership");

    console.info(JSON.stringify({
      scope: "membership-sync",
      source,
      telegram_user_id: telegramUserId,
      previous_membership: previousResult.data?.membership_status ?? null,
      next_membership: data.membership_status,
    }));

    return NextResponse.json({
      ok: true,
      source,
      changed: previousResult.data?.membership_status !== data.membership_status,
      previous_membership: previousResult.data?.membership_status ?? null,
      user: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error(JSON.stringify({ scope: "membership-sync", error: message }));
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
