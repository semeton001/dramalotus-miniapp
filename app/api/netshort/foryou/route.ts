import { NextResponse } from "next/server";
import { normalizeNetshortFeed } from "@/lib/adapters/drama/netshort";

const NETSHORT_FORYOU_URL =
  "https://streamapi.web.id/p/netshort/api/v1/dubbing/1";

const NETSHORT_TOKEN = process.env.NETSHORT_TOKEN?.trim() || "";

export async function GET() {
  try {
    const upstreamUrl = `${NETSHORT_FORYOU_URL}?lang=id_ID&token=${NETSHORT_TOKEN}`;

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
        { error: `Failed to load Netshort ForYou. status=${response.status}` },
        { status: response.status },
      );
    }

    const payload = await response.json();
    const dramas = normalizeNetshortFeed(payload, "foryou", "5");

    return NextResponse.json(dramas, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Netshort ForYou.",
      },
      { status: 500 },
    );
  }
}
