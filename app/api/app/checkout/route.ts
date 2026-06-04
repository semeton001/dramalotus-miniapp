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
    const packageCode = String(body?.package_code || "").trim().toUpperCase();

    if (!packageCode) {
      return NextResponse.json(
        {
          ok: false,
          message: "package_code wajib diisi",
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

    const upstream = await fetch(`${appPaymentBaseUrl}/payment/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-token": internalToken,
      },
      body: JSON.stringify({
        app_user_id: user.id,
        package_code: packageCode,
      }),
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => ({}));

    return NextResponse.json(data, {
      status: upstream.status,
    });
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
