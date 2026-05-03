import { NextRequest, NextResponse } from "next/server";
import { normalizeNetshortFeed } from "@/lib/adapters/drama/netshort";

const NETSHORT_HOME_BASE_URL = "https://netshort.dramabos.my.id/api/home";

export async function GET(request: NextRequest) {
  try {
    const pageParam = request.nextUrl.searchParams.get("page")?.trim() || "1";
    const page = Math.max(1, Number(pageParam) || 1);

    const upstreamUrl = `${NETSHORT_HOME_BASE_URL}/${page}?lang=in`;

    const response = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to load Netshort home. status=${response.status}` },
        { status: response.status },
      );
    }

    const payload = await response.json();
    const dramas = normalizeNetshortFeed(payload, "home", "5");

    return NextResponse.json(dramas, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Netshort home.",
      },
      { status: 500 },
    );
  }
}