import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export async function requireApiVip() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (user.membership_status !== "vip") {
    return NextResponse.json(
      { ok: false, error: "VIP required" },
      { status: 403 }
    );
  }

  if (user.vip_until) {
    const expiresAt = new Date(user.vip_until).getTime();
    if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
      return NextResponse.json(
        { ok: false, error: "VIP expired" },
        { status: 403 }
      );
    }
  }

  return null;
}
