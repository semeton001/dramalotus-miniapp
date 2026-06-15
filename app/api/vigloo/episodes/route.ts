import { NextRequest, NextResponse } from "next/server";
import {
  buildViglooApiUrl,
  VIGLOO_HEADERS,
} from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const dramaId =
      request.nextUrl.searchParams.get("dramaId")?.trim() || "";

    const numericDramaId =
      Number(
        request.nextUrl.searchParams.get("numericDramaId") || "0",
      ) || 0;

    if (!dramaId) {
      return NextResponse.json(
        { error: "Missing dramaId" },
        { status: 400 },
      );
    }

    const response = await fetch(
      buildViglooApiUrl(
        `/vigloo/api/v1/drama/${encodeURIComponent(dramaId)}?lang=id`,
      ),
      {
        cache: "no-store",
        headers: VIGLOO_HEADERS,
      },
    );

    if (!response.ok) {
      throw new Error(
        `Vigloo drama fetch failed (${response.status})`,
      );
    }

    const payload = await response.json();

    const drama = payload?.drama || {};

    const seasons = Array.isArray(drama?.seasons)
      ? drama.seasons
      : [];

    const season = seasons[0] || null;

    if (!season) {
      return NextResponse.json([]);
    }

    const seasonId = toString(season.id);

    const totalEpisodes =
      toNumber(drama.episodeCount) ||
      toNumber(season.episodeCount);

    const episodes = [];

    for (let ep = 1; ep <= totalEpisodes; ep++) {
      episodes.push({
        id: Number(`${numericDramaId || 8}${String(ep).padStart(3, "0")}`),

        dramaId: numericDramaId,

        episodeNumber: ep,

        title: `Episode ${ep}`,

        description: "",

        duration: "",

        thumbnail: undefined,

        sortOrder: ep,

        isLocked: false,
        isVipOnly: false,

        viglooSeasonId: seasonId,
        viglooEpisodeNumber: ep,

        subtitleUrl:
          `/api/vigloo/subtitle` +
          `?seasonId=${encodeURIComponent(seasonId)}` +
          `&ep=${ep}`,

        subtitleLang: "id",
        subtitleLabel: "Indonesian",

        videoUrl:
          `/api/vigloo/stream` +
          `?seasonId=${encodeURIComponent(seasonId)}` +
          `&ep=${ep}`,
      });
    }

    return NextResponse.json(episodes);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Vigloo episodes",
      },
      { status: 500 },
    );
  }
}
