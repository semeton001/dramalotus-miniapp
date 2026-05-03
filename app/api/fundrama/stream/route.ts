import { NextRequest, NextResponse } from "next/server";
import { requireApiVip } from "@/lib/auth/requireApiVip";
import {
  adaptFundramaEpisode,
  extractFundramaEpisodes,
  fetchFundramaJson,
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
          { error: "Missing FunDrama stream url or dramaId/episode." },
          { status: 400 },
        );
      }

      const payload = await fetchFundramaJson(
        `/drama/${encodeURIComponent(dramaId)}`,
      );
      const episodeNumber = Number(episode) || 1;
      const rawEpisode = extractFundramaEpisodes(payload).find((item) => {
        const current = Number(item.erev || item.episode || 0);
        return current === episodeNumber;
      });

      if (rawEpisode) {
        const adapted = adaptFundramaEpisode(rawEpisode, dramaId, Number(dramaId) || 0);
        rawUrl = adapted.originalVideoUrl || "";
      }
    }

    if (!rawUrl) {
      return NextResponse.json(
        { error: "No FunDrama playable video found." },
        { status: 404 },
      );
    }

    return proxyRemoteMedia(request, rawUrl);
  } catch (error) {
    console.error("FunDrama stream route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load FunDrama stream.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
