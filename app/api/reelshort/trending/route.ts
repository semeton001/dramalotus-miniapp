import { NextResponse } from "next/server";
import { adaptReelShortDramas } from "@/lib/adapters/drama/reelshort";

export async function GET() {
  try {
    const response = await fetch(
      "https://reelshort.dramabos.my.id/trending?lang=in",
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
          error: `Upstream ReelShort trending gagal. status=${response.status}`,
          upstreamBody: text,
        },
        { status: response.status },
      );
    }

    const payload = text ? JSON.parse(text) : {};
    return NextResponse.json(adaptReelShortDramas(payload), { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal memuat ReelShort trending.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}