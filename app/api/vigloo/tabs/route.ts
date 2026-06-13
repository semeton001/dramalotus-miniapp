import { NextResponse } from "next/server";
import {
  buildViglooApiUrl,
  VIGLOO_HEADERS,
} from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const response = await fetch(
      buildViglooApiUrl(
        "/vigloo/api/v1/tabs?lang=id",
      ),
      {
        cache: "no-store",
        headers: VIGLOO_HEADERS,
      },
    );

    if (!response.ok) {
      throw new Error(
        `Vigloo tabs failed ${response.status}`,
      );
    }

    const json = await response.json();

    const payloads = Array.isArray(
      json?.payloads,
    )
      ? json.payloads
      : [];

    const tabs = payloads.map((item: any) => ({
      categoryId: String(item.id),
      name: String(item.title || ""),
      bundlesSettingId: Number(
        item.bundlesSettingId || 0,
      ),
    }));

    return NextResponse.json(tabs);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Tabs failed",
      },
      { status: 500 },
    );
  }
}
