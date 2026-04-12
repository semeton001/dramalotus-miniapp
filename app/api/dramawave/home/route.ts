import { NextRequest, NextResponse } from "next/server";
import { normalizeDramawaveFeed } from "@/lib/adapters/drama/dramawave";

export async function GET(request: NextRequest) {
  try {
    const pageParam = request.nextUrl.searchParams.get("page")?.trim() || "1";
    const page = Math.max(1, Number(pageParam) || 1);

    const upstreamUrl = new URL("https://dramawave.dramabos.my.id/api/home");
    upstreamUrl.searchParams.set("lang", "in");
    upstreamUrl.searchParams.set("page", String(page));

    const response = await fetch(upstreamUrl.toString(), { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Gagal memuat home Dramawave. status=${response.status}` },
        { status: response.status },
      );
    }

    const payload = await response.json();
    const dramas = normalizeDramawaveFeed(payload, "home");

    return NextResponse.json(dramas);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat home Dramawave.",
      },
      { status: 500 },
    );
  }
}