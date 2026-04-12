import { NextRequest, NextResponse } from "next/server";

const TEMP_VIP_USER_IDS = new Set([
  "6536406815",
  "2046400681",
]);

export async function GET(request: NextRequest) {
  const telegramUserId = request.nextUrl.searchParams.get("telegram_user_id");

  if (!telegramUserId) {
    return NextResponse.json(
      { error: "telegram_user_id wajib diisi." },
      { status: 400 },
    );
  }

  const membership_status = TEMP_VIP_USER_IDS.has(telegramUserId)
    ? "vip"
    : "free";

  return NextResponse.json({
    telegram_user_id: telegramUserId,
    membership_status,
  });
}