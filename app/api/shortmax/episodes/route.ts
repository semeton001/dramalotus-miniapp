import { NextRequest, NextResponse } from "next/server";

type ShortmaxEpisodeItem = {
  episode?: number;
  id?: number;
  name?: string;
  duration?: number;
  locked?: boolean;
  cover?: string;
  expires?: number;
  expires_in?: number;
  video?: {
    video_1080?: string;
    video_720?: string;
    video_480?: string;
  };
};

type ShortmaxAllepsResponse = {
  data?: {
    code?: number | string;
    name?: string;
    totalEpisodes?: number;
    summary?: string;
    cover?: string;
    episodes?: ShortmaxEpisodeItem[];
  };
  cached?: boolean;
};

function pickBestVideoUrl(item: ShortmaxEpisodeItem): string {
  return (
    item.video?.video_1080?.trim() ||
    item.video?.video_720?.trim() ||
    item.video?.video_480?.trim() ||
    ""
  );
}

function normalizeDuration(value?: number): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }

  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dramaId = searchParams.get("dramaId")?.trim() || "";
    const numericDramaId = Number(searchParams.get("numericDramaId") || 0);

    if (!dramaId) {
      return NextResponse.json({ error: "Missing dramaId" }, { status: 400 });
    }

    const token = process.env.SHORTMAX_TOKEN?.trim() || "";

    if (!token) {
      return NextResponse.json(
        { error: "Missing SHORTMAX_TOKEN in environment" },
        { status: 500 },
      );
    }

    const endpoint =
      `https://shortmax.dramabos.my.id/api/v1/alleps/${encodeURIComponent(dramaId)}` +
      `?lang=id&code=${encodeURIComponent(token)}&_ts=${Date.now()}`;

    const response = await fetch(endpoint, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return NextResponse.json(
        {
          error: "Failed to fetch Shortmax episodes",
          endpoint,
          status: response.status,
          bodyPreview: body.slice(0, 220),
        },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as ShortmaxAllepsResponse;

    const rawEpisodes = Array.isArray(payload?.data?.episodes)
      ? payload.data.episodes
      : [];

    const normalizedEpisodes = rawEpisodes
      .map((item, index) => {
        const episodeNumber =
          typeof item.episode === "number" && Number.isFinite(item.episode)
            ? item.episode
            : index + 1;

        const originalVideoUrl = pickBestVideoUrl(item);
        if (!originalVideoUrl) return null;

        const stableEpisodeId =
          typeof item.id === "number" && Number.isFinite(item.id)
            ? item.id
            : Number(
                `${numericDramaId || 0}${String(episodeNumber).padStart(3, "0")}`,
              );

        return {
          id: stableEpisodeId,
          dramaId: numericDramaId || 0,
          episodeNumber,
          title:
            typeof item.name === "string" && item.name.trim().length > 0
              ? `${item.name.trim()} - Episode ${episodeNumber}`
              : `Episode ${episodeNumber}`,
          duration: normalizeDuration(item.duration),
          videoUrl: `/api/shortmax/stream?u=${encodeURIComponent(originalVideoUrl)}`,
          originalVideoUrl,
          subtitleUrl: undefined,
          subtitleLang: undefined,
          subtitleLabel: undefined,
          isLocked: Boolean(item.locked),
          thumbnail: item.cover || undefined,
        };
      })
      .filter(Boolean);

    return NextResponse.json(normalizedEpisodes, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown Shortmax episodes error",
      },
      { status: 500 },
    );
  }
}
