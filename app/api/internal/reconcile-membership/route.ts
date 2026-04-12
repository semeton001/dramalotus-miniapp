import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type ReconcilePayload = {
  telegram_user_id?: number | string;
  membership_status?: "free" | "vip" | string;
  source?: string | null;
};

function getSecretFromRequest(request: Request) {
  return (
    request.headers.get("x-sync-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  );
}

function getExpectedSecret() {
  return process.env.SYNC_MEMBERSHIP_SECRET || process.env.DEBUG_ADMIN_SECRET || "";
}

function normalizeTelegramUserId(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value.trim());
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function normalizeMembershipStatus(value: unknown): "free" | "vip" | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized === "free" || normalized === "vip" ? normalized : null;
}

export async function POST(request: Request) {
  try {
    const providedSecret = getSecretFromRequest(request);
    const expectedSecret = getExpectedSecret();

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ReconcilePayload;
    const telegramUserId = normalizeTelegramUserId(body.telegram_user_id);
    const membershipStatus = normalizeMembershipStatus(body.membership_status);
    const source =
      typeof body.source === "string" && body.source.trim().length > 0
        ? body.source.trim()
        : "manual-reconcile";

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
      .select("id, telegram_user_id, membership_status")
      .eq("telegram_user_id", telegramUserId)
      .maybeSingle();

    if (previousResult.error) throw new Error(previousResult.error.message);

    const { data, error } = await supabaseAdmin
      .from("users")
      .update({ membership_status: membershipStatus })
      .eq("telegram_user_id", telegramUserId)
      .select("id, telegram_user_id, membership_status")
      .single();

    if (error || !data) throw new Error(error?.message || "Failed to reconcile membership");

    console.info(JSON.stringify({
      scope: "membership-reconcile",
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
    console.error(JSON.stringify({ scope: "membership-reconcile", error: message }));
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
