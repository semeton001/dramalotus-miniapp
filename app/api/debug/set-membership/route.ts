import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const debugSecret = req.headers.get("x-debug-secret");

  if (
    !process.env.DEBUG_ADMIN_SECRET ||
    debugSecret !== process.env.DEBUG_ADMIN_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const telegramUserId = Number(body.telegram_user_id);
  const membershipStatus = body.membership_status;

  if (!telegramUserId) {
    return NextResponse.json(
      { error: "telegram_user_id is required" },
      { status: 400 }
    );
  }

  if (!["free", "vip"].includes(membershipStatus)) {
    return NextResponse.json(
      { error: "membership_status must be free or vip" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("users")
    .update({
      membership_status: membershipStatus,
    })
    .eq("telegram_user_id", telegramUserId)
    .select("id, telegram_user_id, membership_status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    user: data,
  });
}
