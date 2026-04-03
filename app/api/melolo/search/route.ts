import { NextRequest, NextResponse } from "next/server";
import { adaptMeloloSearchList } from "@/lib/adapters/drama/melolo";

const MELOLO_SEARCH_BASE_URL =
  "https://melolo.dramabos.my.id/api/search?lang=id&q=";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() ?? "";

    if (!query) {
      return NextResponse.json([], { status: 200 });
    }

    const upstreamUrl =
      `${MELOLO_SEARCH_BASE_URL}${encodeURIComponent(query)}`;

    const response = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Melolo search upstream failed with status ${response.status}` },
        { status: response.status },
      );
    }

    const payload = await response.json();
    const dramas = adaptMeloloSearchList(payload);

    return NextResponse.json(dramas, { status: 200 });
  } catch (error) {
    console.error("Melolo search route error:", error);

    return NextResponse.json(
      { error: "Failed to search Melolo dramas" },
      { status: 500 },
    );
  }
}