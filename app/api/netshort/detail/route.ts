import { NextRequest, NextResponse } from "next/server";
import type { Drama } from "@/types/drama";

const NETSHORT_DETAIL_BASE_URL =
  "https://captain.sapimu.au/netshort/api/v1/detail";

const NETSHORT_TOKEN = process.env.NETSHORT_TOKEN?.trim() || "";

type StreamapiNetshortDetailResponse = {
  code?: number;
  data?: {
    id?: string | number;
    title?: string;
    cover?: string;
    description?: string;
    labels?: string[];
    totalEpisodes?: number;
    isFinished?: boolean;
    episodes?: Array<{
      episodeNo?: number;
      episodeId?: string | number;
      cover?: string;
      isLocked?: boolean;
    }>;
  };
};

function toNumberId(value: string): number {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;

  let hash = 0;
  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash || Date.now();
}

export async function GET(request: NextRequest) {
  const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim() || "";

  if (!dramaId) {
    return NextResponse.json(
      { error: "dramaId is required." },
      { status: 400 },
    );
  }

  try {
    const upstreamUrl = `${NETSHORT_DETAIL_BASE_URL}/${encodeURIComponent(
      dramaId,
    )}?lang=id_ID&token=${NETSHORT_TOKEN}`;

    const response = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Netshort detail failed: ${response.status}` },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as StreamapiNetshortDetailResponse;
    const item = payload.data;

    if (!item || !item.id) {
      return NextResponse.json(
        { error: "Invalid Netshort detail payload." },
        { status: 502 },
      );
    }

    const rawId = String(item.id);
    const title = typeof item.title === "string" ? item.title : "Netshort";
    const cover = typeof item.cover === "string" ? item.cover : "";
    const labels = Array.isArray(item.labels) ? item.labels : [];
    const totalEpisodes =
      typeof item.totalEpisodes === "number" ? item.totalEpisodes : 0;

    const drama: Drama = {
      id: toNumberId(rawId),
      source: "Netshort",
      sourceId: "5",
      sourceName: "Netshort",
      title,
      episodes: totalEpisodes,
      badge: item.isFinished ? "Selesai" : "Netshort",
      tags: labels.length > 0 ? labels : ["Drama"],
      posterClass: "from-[#10203A] via-[#12131A] to-[#090B12]",
      slug: `netshort-${rawId}`,
      description:
        typeof item.description === "string" ? item.description : "",
      coverImage: cover || undefined,
      posterImage: cover || undefined,
      category: "Drama",
      language: "id",
      country: undefined,
      isNew: false,
      isDubbed: true,
      isTrending: false,
      sortOrder: 0,
      netshortRawId: rawId,
      netshortDramaId: rawId,
    };

    return NextResponse.json(drama);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Netshort detail.",
      },
      { status: 500 },
    );
  }
}
