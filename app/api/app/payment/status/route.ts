import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
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
          message: "invoice_id wajib diisi",
        },
        { status: 400 }
      );
    }

    const appPaymentBaseUrl = (process.env.APP_PAYMENT_BASE_URL || "").trim().replace(/\/$/, "");
    const internalToken = (process.env.APP_PAYMENT_INTERNAL_TOKEN || "").trim();

    if (!appPaymentBaseUrl || !internalToken) {
      return NextResponse.json(
        {
          ok: false,
          message: "APP payment env belum lengkap",
        },
        { status: 500 }
      );
    }

    const upstream = await fetch(`${appPaymentBaseUrl}/payment/recheck`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-token": internalToken,
      },
      body: JSON.stringify({
        invoice_id: invoiceId,
      }),
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => ({}));

    return NextResponse.json(
      {
        ok: true,
        result: {
          result: data,
        },
      },
      {
        status: upstream.status,
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message: error instanceof Error ? error.message : "Internal error",
      },
      { status: 500 }
    );
  }
}
