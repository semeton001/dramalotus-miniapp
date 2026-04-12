import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

const PACKAGE_CONFIG: Record<string, { days: number; amount: number; label: string }> = {
  VIP1: { days: 1, amount: 2000, label: "VIP 1 Hari" },
  VIP3: { days: 3, amount: 5500, label: "VIP 3 Hari" },
  VIP7: { days: 7, amount: 10900, label: "VIP 7 Hari" },
  VIP15: { days: 15, amount: 20900, label: "VIP 15 Hari" },
  VIP30: { days: 30, amount: 34900, label: "VIP 30 Hari" },
  VIP90: { days: 90, amount: 99000, label: "VIP 90 Hari" },
};

function getBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          code: "UNAUTHORIZED",
          message: "Login diperlukan",
          redirect_to: "/login?next=/upgrade",
        },
        { status: 401 }
      );
    }

    if (user.membership_status === "vip") {
      return NextResponse.json(
        {
          ok: false,
          code: "ALREADY_VIP",
          message: "Akun ini sudah VIP",
        },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const packageCode = String(body?.package_code || "")
      .trim()
      .toUpperCase();

    if (!packageCode || !PACKAGE_CONFIG[packageCode]) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVALID_PACKAGE",
          message: "package_code tidak valid",
        },
        { status: 400 }
      );
    }

    const vipServerBaseUrl = (process.env.VIP_SERVER_BASE_URL || "").trim().replace(/\/$/, "");
    const webCheckoutToken = (process.env.WEB_CHECKOUT_TOKEN || process.env.VIP_SERVER_WEB_TOKEN || "")
      .trim();

    if (!vipServerBaseUrl) {
      return NextResponse.json(
        {
          ok: false,
          code: "VIP_SERVER_BASE_URL_MISSING",
          message: "VIP_SERVER_BASE_URL belum di-set",
        },
        { status: 500 }
      );
    }

    if (!webCheckoutToken) {
      return NextResponse.json(
        {
          ok: false,
          code: "WEB_CHECKOUT_TOKEN_MISSING",
          message: "WEB_CHECKOUT_TOKEN atau VIP_SERVER_WEB_TOKEN belum di-set",
        },
        { status: 500 }
      );
    }

    const telegramUserIdRaw =
      user.telegram_user_id ??
      user.telegram_id ??
      user.telegramId ??
      null;

    const telegramUserId = Number(telegramUserIdRaw || 0);

    if (!telegramUserId || Number.isNaN(telegramUserId) || telegramUserId <= 0) {
      return NextResponse.json(
        {
          ok: false,
          code: "TELEGRAM_ID_NOT_FOUND",
          message: "telegram_user_id user tidak ditemukan",
        },
        { status: 400 }
      );
    }

    const appBaseUrl = getBaseUrl();
    const returnUrl = `${appBaseUrl}/upgrade?status=success`;
    const cancelUrl = `${appBaseUrl}/upgrade?status=cancelled`;

    const upstreamResponse = await fetch(`${vipServerBaseUrl}/web/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": webCheckoutToken,
      },
      body: JSON.stringify({
        telegram_id: telegramUserId,
        package_code: packageCode,
        source: "web-upgrade",
        success_redirect_url: returnUrl,
        cancel_redirect_url: cancelUrl,
        customer: {
          telegram_user_id: telegramUserId,
          telegram_username: user.telegram_username ?? null,
          first_name: user.first_name ?? null,
          last_name: user.last_name ?? null,
          website_user_id: user.id ?? null,
        },
      }),
      cache: "no-store",
    });

    const data = await upstreamResponse.json().catch(() => null);

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: "UPSTREAM_ERROR",
          message:
            (data && typeof data === "object" && "detail" in data && String(data.detail)) ||
            "Gagal membuat checkout ke VIP server",
          upstream_status: upstreamResponse.status,
          upstream: data,
        },
        { status: 502 }
      );
    }

    const checkoutUrl =
      (data && typeof data === "object" && (
        (data as any).checkout_url ||
        (data as any).payment_url ||
        (data as any).invoice_url ||
        (data as any).pay_url
      )) ||
      null;

    if (!checkoutUrl || typeof checkoutUrl !== "string") {
      return NextResponse.json(
        {
          ok: false,
          code: "CHECKOUT_URL_MISSING",
          message: "VIP server tidak mengembalikan checkout_url",
          upstream: data,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      package_code: packageCode,
      package: PACKAGE_CONFIG[packageCode],
      checkout_url: checkoutUrl,
      invoice_id:
        (data && typeof data === "object" && ((data as any).invoice_id || (data as any).invoice_no)) || null,
      upstream: data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        code: "INTERNAL_ERROR",
        message,
      },
      { status: 500 }
    );
  }
}
