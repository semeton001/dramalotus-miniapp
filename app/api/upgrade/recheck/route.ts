import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

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

    const body = await request.json().catch(() => ({}));
    const invoiceId = String(body?.invoice_id || "").trim();

    if (!invoiceId) {
      return NextResponse.json(
        {
          ok: false,
          code: "INVOICE_ID_REQUIRED",
          message: "invoice_id wajib diisi",
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

    const upstreamResponse = await fetch(`${vipServerBaseUrl}/web/recheck`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-web-token": webCheckoutToken,
      },
      body: JSON.stringify({
        invoice_id: invoiceId,
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
            "Gagal recheck pembayaran ke VIP server",
          upstream_status: upstreamResponse.status,
          upstream: data,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      invoice_id: invoiceId,
      result: data,
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
