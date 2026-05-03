import { NextRequest, NextResponse } from "next/server";
import { requireApiVip } from "@/lib/auth/requireApiVip";
import {
  adaptMicrodramaEpisode,
  extractMicrodramaEpisodes,
  fetchMicrodramaJson,
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

    const dramaId =
      request.nextUrl.searchParams.get("dramaId")?.trim() ||
      request.nextUrl.searchParams.get("id")?.trim() ||
      "";
    const episode =
      request.nextUrl.searchParams.get("episode")?.trim() ||
      request.nextUrl.searchParams.get("ep")?.trim() ||
      "";

    if (!rawUrl) {
      if (!dramaId || !episode) {
        return NextResponse.json(
          { error: "Missing MicroDrama stream url or dramaId/episode." },
          { status: 400 },
        );
      }

      const payload = await fetchMicrodramaJson(
        `/dramas/${encodeURIComponent(dramaId)}`,
      );
      const episodeNumber = Number(episode) || 1;
      const rawEpisode = extractMicrodramaEpisodes(payload).find((item) => {
        const current = Number(item.index || item.episode || 0);
        return current === episodeNumber;
      });

      if (rawEpisode) {
        const adapted = adaptMicrodramaEpisode(
          rawEpisode,
          dramaId,
          Number(dramaId) || 0,
        );
        rawUrl = adapted.originalVideoUrl || "";
      }
    }

    if (!rawUrl) {
      return NextResponse.json(
        { error: "No MicroDrama playable video found." },
        { status: 404 },
      );
    }

    return proxyRemoteMedia(request, rawUrl);
  } catch (error) {
    console.error("MicroDrama stream route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load MicroDrama stream.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
