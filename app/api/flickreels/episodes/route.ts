import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FLICKREELS_BATCH_CODE =
  process.env.FLICKREELS_BATCH_CODE || "4D96F22760EA30FB0FFBA9AA87A979A6";

type FlickreelsBatchItem = {
  chapter_num?: number | string;
  chapter_id?: number | string;
  chapter_title?: string;
  chapter_cover?: string;
  duration?: number | string;
  is_lock?: number | string;
  is_vip_episode?: number | string;
  play_url?: string;
  origin_url?: string;
};

type FlickreelsBatchResponse = {
  status_code?: number;
  msg?: string;
  data?: {
    playlet_id?: string;
    title?: string;
    cover?: string;
    total_eps?: number;
    free_eps?: number;
    locked_eps?: number;
    unlocked?: number;
    failed?: number;
    elapsed_sec?: number;
    cached?: boolean;
    list?: FlickreelsBatchItem[];
  };
};

function encodeUrlToken(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainSeconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainSeconds).padStart(2, "0")}`;
}

function buildStableEpisodeId(
  numericDramaId: number,
  chapterId: string,
  episodeNumber: number,
): number {
  const direct = Number(chapterId);
  if (Number.isFinite(direct) && direct > 0) return direct;

  return Number(
    `${numericDramaId || 9}${String(episodeNumber).padStart(3, "0")}`,
  );
}

function buildVideoUrlFromJson(item: FlickreelsBatchItem): string {
  const playUrl = toStringValue(item.play_url);

  if (!playUrl) {
    return "";
  }

  return `/api/flickreels/stream?u=${encodeUrlToken(playUrl)}`;
}

export async function GET(request: NextRequest) {
  try {
    const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim() || "";
    const numericDramaIdRaw =
      request.nextUrl.searchParams.get("numericDramaId")?.trim() || "0";
    const numericDramaId = Number(numericDramaIdRaw) || 0;

    if (!dramaId) {
      return NextResponse.json({ error: "Missing dramaId" }, { status: 400 });
    }

    const upstreamUrl = new URL(
      `https://flickreels.dramabos.my.id/batchload/${encodeURIComponent(dramaId)}`,
    );
    upstreamUrl.searchParams.set("lang", "6");
    upstreamUrl.searchParams.set("code", FLICKREELS_BATCH_CODE);

    const response = await fetch(upstreamUrl.toString(), {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json,text/plain,*/*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch Flickreels episodes. status=${response.status}`,
      );
    }

    const payload = (await response.json()) as FlickreelsBatchResponse;
    const rawList = Array.isArray(payload?.data?.list) ? payload.data.list : [];

    const episodes = rawList
      .map((item, index) => {
        const episodeNumber =
          toNumberValue(item.chapter_num) || index + 1;

        const chapterId =
          toStringValue(item.chapter_id) || `${dramaId}-${episodeNumber}`;

        const title =
          toStringValue(item.chapter_title) || `Episode ${episodeNumber}`;

        const isLocked = toNumberValue(item.is_lock) === 1;
        const isVipOnly = toNumberValue(item.is_vip_episode) === 1;

        return {
          id: buildStableEpisodeId(numericDramaId, chapterId, episodeNumber),
          dramaId: numericDramaId,
          episodeNumber,
          title,
          duration: formatDuration(toNumberValue(item.duration)),
          description: "",
          thumbnail: toStringValue(item.chapter_cover) || undefined,
          videoUrl: buildVideoUrlFromJson(item),
          isLocked,
          isVipOnly,
          sortOrder: episodeNumber,
          flickreelsEpisodeId: chapterId,
          flickreelsVid: chapterId,
        };
      })
      .sort((a, b) => a.episodeNumber - b.episodeNumber);

    return NextResponse.json(episodes, { status: 200 });
  } catch (error) {
    console.error("Flickreels episodes error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Flickreels episodes.",
      },
      { status: 500 },
    );
  }
}