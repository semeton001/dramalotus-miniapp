import { NextRequest, NextResponse } from "next/server";
import { requireApiVip } from "@/lib/auth/requireApiVip";
import {
  buildDramapopsEpisode,
  proxyRemoteMedia,
} from "../_shared";

export async function GET(request: NextRequest) {
  const vipError = await requireApiVip();
  if (vipError) return vipError;

  try {
    let rawUrl =
      request.nextUrl.searchParams.get("url")?.trim() ||
      request.nextUrl.searchParams.get("u")?.trim() ||
      "";

    const movieId =
      request.nextUrl.searchParams.get("movieId")?.trim() ||
      request.nextUrl.searchParams.get("dramaId")?.trim() ||
      request.nextUrl.searchParams.get("id")?.trim() ||
      "";
    const episode =
      request.nextUrl.searchParams.get("episode")?.trim() ||
      request.nextUrl.searchParams.get("ep")?.trim() ||
      "";

    if (!rawUrl) {
      if (!movieId || !episode) {
        return NextResponse.json(
          { error: "Missing Dramapops stream url or movieId/episode." },
          { status: 400 },
        );
      }

      const adapted = await buildDramapopsEpisode(
        movieId,
        Number(episode) || 1,
        Number(movieId) || 0,
      );
      rawUrl = adapted.originalVideoUrl || "";
    }

    if (!rawUrl) {
      return NextResponse.json(
        { error: "No Dramapops playable video found." },
        { status: 404 },
      );
    }

    return proxyRemoteMedia(request, rawUrl);
  } catch (error) {
    console.error("Dramapops stream route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load Dramapops stream.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
