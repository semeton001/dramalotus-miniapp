import { NextRequest, NextResponse } from "next/server";
import { requireApiVip } from "@/lib/auth/requireApiVip";
import {
  extractEpisodeStreamUrl,
  fetchStardustJson,
  proxyMedia,
} from "../_shared";

export async function GET(request: NextRequest) {
  const vipError = await requireApiVip();
  if (vipError) return vipError;

  try {
    let rawUrl =
      request.nextUrl.searchParams.get("url")?.trim() ||
      request.nextUrl.searchParams.get("u")?.trim() ||
      "";

    const videoId =
      request.nextUrl.searchParams.get("videoId")?.trim() ||
      request.nextUrl.searchParams.get("dramaId")?.trim() ||
      "";
    const episode =
      request.nextUrl.searchParams.get("episode")?.trim() ||
      request.nextUrl.searchParams.get("ep")?.trim() ||
      "";

    if (!rawUrl) {
      if (!videoId || !episode) {
        return NextResponse.json(
          { error: "Missing StardustTV stream url or videoId/episode." },
          { status: 400 },
        );
      }

      const payload = await fetchStardustJson(
        `/video/${encodeURIComponent(videoId)}/episode/${encodeURIComponent(
          episode,
        )}`,
      );

      rawUrl = extractEpisodeStreamUrl(payload);
    }

    if (!rawUrl) {
      return NextResponse.json(
        { error: "No StardustTV playable stream found." },
        { status: 404 },
      );
    }

    return proxyMedia(request, rawUrl);
  } catch (error) {
    console.error("StardustTV stream route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load StardustTV stream.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
