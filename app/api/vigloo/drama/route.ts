import { NextRequest, NextResponse } from "next/server";
import { buildViglooApiUrl, VIGLOO_HEADERS } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const dramaId =
      request.nextUrl.searchParams.get("id")?.trim() || "";

    if (!dramaId) {
      return NextResponse.json(
        { error: "Missing drama id" },
        { status: 400 },
      );
    }

    const response = await fetch(
      buildViglooApiUrl(`/vigloo/api/v1/drama/${encodeURIComponent(dramaId)}?lang=id`),
      {
        cache: "no-store",
        headers: VIGLOO_HEADERS,
      },
    );

    const text = await response.text();

    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
