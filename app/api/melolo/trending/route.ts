import { NextResponse } from "next/server";
import {
  adaptMeloloDramaList,
  adaptMeloloSearchList,
} from "@/lib/adapters/drama/melolo";

const PRIMARY_URL = "https://api.sansekai.my.id/api/melolo/trending";
const FALLBACK_URL = "https://melolo.dramabos.my.id/api/home?lang=id&offset=0";

export async function GET() {
  try {
    const primary = await fetch(PRIMARY_URL, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (primary.ok) {
      const payload = await primary.json();
      return NextResponse.json(adaptMeloloSearchList(payload), {
        status: 200,
      });
    }

    const fallback = await fetch(FALLBACK_URL, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!fallback.ok) {
      return NextResponse.json(
        {
          error: `Melolo trending failed. primary=${primary.status} fallback=${fallback.status}`,
        },
        { status: fallback.status },
      );
    }

    const payload = await fallback.json();
    return NextResponse.json(adaptMeloloDramaList(payload), {
      status: 200,
    });
  } catch (error) {
    console.error("Melolo trending route error:", error);

    return NextResponse.json(
      { error: "Failed to load Melolo trending feed" },
      { status: 500 },
    );
  }
}