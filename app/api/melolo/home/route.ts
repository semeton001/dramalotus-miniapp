import { NextRequest, NextResponse } from "next/server";
import { adaptMeloloDramaList } from "@/lib/adapters/drama/melolo";

const MELOLO_HOME_BASE_URL = "https://melolo.dramabos.my.id/api/home";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const offset = searchParams.get("offset")?.trim() ?? "0";

    const upstreamUrl =
      `${MELOLO_HOME_BASE_URL}?lang=id&offset=${encodeURIComponent(offset)}`;

    const response = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Melolo home upstream failed with status ${response.status}` },
        { status: response.status },
      );
    }

    const payload = await response.json();
    const dramas = adaptMeloloDramaList(payload);

    return NextResponse.json(dramas, { status: 200 });
  } catch (error) {
    console.error("Melolo home route error:", error);

    return NextResponse.json(
      { error: "Failed to load Melolo home feed" },
      { status: 500 },
    );
  }
}