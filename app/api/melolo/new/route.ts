import { NextResponse } from "next/server";
import { adaptMeloloSearchList } from "@/lib/adapters/drama/melolo";

const UPSTREAM_URL = "https://captain.sapimu.au/reelshort/api/v1/new";

export async function GET() {
  try {
    const response = await fetch(UPSTREAM_URL, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Melolo new upstream failed with status ${response.status}` },
        { status: response.status },
      );
    }

    const payload = await response.json();
    const dramas = adaptMeloloSearchList(payload);

    return NextResponse.json(dramas, { status: 200 });
  } catch (error) {
    console.error("Melolo new route error:", error);

    return NextResponse.json(
      { error: "Failed to load Melolo terbaru feed" },
      { status: 500 },
    );
  }
}