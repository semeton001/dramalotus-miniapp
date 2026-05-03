import { NextRequest, NextResponse } from "next/server";
import { requireApiVip } from "@/lib/auth/requireApiVip";
import { proxyRemoteMedia, resolveBiliTVVideoUrl } from "../_shared";

export async function GET(request: NextRequest) {
  const vipError = await requireApiVip();
  if (vipError) return vipError;

  try {
    let rawUrl =
      request.nextUrl.searchParams.get("url")?.trim() ||
      request.nextUrl.searchParams.get("u")?.trim() ||
      "";
    const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim() || "";
    const episode = request.nextUrl.searchParams.get("episode")?.trim() || "";

    if (!rawUrl && dramaId && episode) {
      rawUrl = await resolveBiliTVVideoUrl(dramaId, episode);
    }

    if (!rawUrl) {
      return NextResponse.json(
        { error: "Missing BiliTV stream url or dramaId/episode." },
        { status: 400 },
      );
    }

    return proxyRemoteMedia(request, rawUrl);
  } catch (error) {
    console.error("BiliTV stream route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load BiliTV stream.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
