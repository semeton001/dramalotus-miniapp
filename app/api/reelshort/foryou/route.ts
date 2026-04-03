import { NextResponse } from "next/server";
import { adaptReelShortDramas } from "@/lib/adapters/drama/reelshort";

export async function GET() {
  try {
    const response = await fetch(
      "https://reelshort.dramabos.my.id/home?tab=for-you&lang=id",
      {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          Origin: "https://api.sansekai.my.id",
          Referer: "https://api.sansekai.my.id/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
        },
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream ReelShort foryou gagal. status=${response.status}` },
        { status: response.status },
      );
    }

    const payload = await response.json();
    return NextResponse.json(adaptReelShortDramas(payload), { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Gagal memuat ReelShort foryou." },
      { status: 500 },
    );
  }
}