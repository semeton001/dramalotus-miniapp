import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";

    if (!query) {
      return NextResponse.json([], { status: 200 });
    }

    const response = await fetch(
      `https://reelshort.dramabos.my.id/search?q=${encodeURIComponent(query)}&lang=in`,
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        },
      },
    );

    const text = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Upstream ReelShort search gagal. status=${response.status}`,
          upstreamBody: text,
        },
        { status: response.status },
      );
    }

    return new NextResponse(text, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal memuat ReelShort search.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}