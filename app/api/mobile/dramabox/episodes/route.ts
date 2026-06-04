import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function cleanBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export async function GET(request: NextRequest) {
  const bookId = request.nextUrl.searchParams.get("bookId")?.trim() || "";
  const lang = request.nextUrl.searchParams.get("lang")?.trim() || "in";

  if (!bookId || !/^\d+$/.test(bookId)) {
    return NextResponse.json(
      { error: "bookId must be a valid numeric string" },
      { status: 400 },
    );
  }

  const baseUrl = process.env.DRAMABOX_STREAM_API_BASE_URL;
  const token = process.env.DRAMABOX_STREAM_API_TOKEN;

  if (!baseUrl || !token) {
    return NextResponse.json(
      { error: "DramaBox stream API env is not configured" },
      { status: 500 },
    );
  }

  try {
    const url =
      `${cleanBaseUrl(baseUrl)}/drama/${encodeURIComponent(bookId)}/episodes` +
      `?lang=${encodeURIComponent(lang)}` +
      `&token=${encodeURIComponent(token)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 13; DramaLotusApp) AppleWebKit/537.36",
      },
      cache: "no-store",
    });

    const text = await response.text();

    let payload: unknown;

    try {
      payload = JSON.parse(text);
    } catch {
      payload = {
        error: "Upstream response is not valid JSON",
        raw: text.slice(0, 500),
      };
    }

    return NextResponse.json(payload, {
      status: response.ok ? 200 : response.status,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to fetch DramaBox mobile episodes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
