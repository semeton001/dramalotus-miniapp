import { NextRequest, NextResponse } from "next/server";
import { requireApiVip } from "@/lib/auth/requireApiVip";
import {
  extractPlayVideoUrl,
  fetchFlextvJson,
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

    const seriesId =
      request.nextUrl.searchParams.get("seriesId")?.trim() ||
      request.nextUrl.searchParams.get("dramaId")?.trim() ||
      "";
    const episodeId =
      request.nextUrl.searchParams.get("episodeId")?.trim() ||
      request.nextUrl.searchParams.get("ep")?.trim() ||
      "";

    if (!rawUrl) {
      if (!seriesId || !episodeId) {
        return NextResponse.json(
          { error: "Missing FlexTV stream url or seriesId/episodeId." },
          { status: 400 },
        );
      }

      const payload = await fetchFlextvJson(
        `/play/${encodeURIComponent(seriesId)}/${encodeURIComponent(episodeId)}`,
      );

      rawUrl = extractPlayVideoUrl(payload);
    }

    if (!rawUrl) {
      return NextResponse.json(
        { error: "No FlexTV playable video found." },
        { status: 404 },
      );
    }

    return proxyRemoteMedia(request, rawUrl);
  } catch (error) {
    console.error("FlexTV stream route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load FlexTV stream.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
