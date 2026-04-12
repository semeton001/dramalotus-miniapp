import { NextRequest, NextResponse } from "next/server";
import type { Drama } from "@/types/drama";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FlickreelsHomeTag = {
  id?: string | number;
  name?: string;
  base_id?: string | number;
  sort?: string | number;
};

type FlickreelsHomeItem = {
  playlet_id?: string | number;
  title?: string;
  cover?: string;
  upload_num?: string | number;
  introduce?: string;
  tag_list?: FlickreelsHomeTag[];
  is_playlet_trailer?: boolean;
};

type FlickreelsHomeResponse = {
  status_code?: number;
  msg?: string;
  data?: {
    data?: FlickreelsHomeItem[];
    page_info?: {
      page?: number;
      page_size?: number;
      total?: number;
    };
  };
};

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

function normalizeTags(tagList: unknown): string[] {
  if (!Array.isArray(tagList)) return [];

  return tagList
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      return toStringValue((item as FlickreelsHomeTag).name);
    })
    .filter(Boolean)
    .slice(0, 8);
}

function buildPosterClass(index: number): string {
  const variants = [
    "from-[#0F172A] via-[#111827] to-[#1D4ED8]",
    "from-[#1F2937] via-[#111827] to-[#0F766E]",
    "from-[#3A102A] via-[#12131A] to-[#090B12]",
    "from-[#172554] via-[#1E293B] to-[#0F172A]",
  ];

  return variants[index % variants.length];
}

function normalizeDrama(item: FlickreelsHomeItem, index: number): Drama {
  const playletId = toStringValue(item.playlet_id);
  const numericId = toNumberValue(item.playlet_id, 100000 + index);
  const title = toStringValue(item.title) || "Tanpa Judul";
  const cover = toStringValue(item.cover);
  const uploadNum = toNumberValue(item.upload_num);
  const description = toStringValue(item.introduce);
  const tags = normalizeTags(item.tag_list);

  return {
    id: numericId,
    source: "Flickreels",
    sourceId: "6",
    sourceName: "Flickreels",
    title,
    episodes: uploadNum,
    badge: "Flickreels",
    tags: tags.length > 0 ? tags : ["Drama"],
    posterClass: buildPosterClass(index),
    slug: playletId ? `flickreels-${playletId}` : `flickreels-${numericId}`,
    description,
    coverImage: cover || undefined,
    posterImage: cover || undefined,
    category: "Drama",
    language: "in",
    country: undefined,
    isNew: false,
    isDubbed: false,
    isTrending: false,
    sortOrder: index,
    rating: undefined,
    releaseYear: undefined,
    flickreelsRawId: playletId || undefined,
    flickreelsDramaId: playletId || undefined,
  } as Drama;
}

export async function GET(request: NextRequest) {
  try {
    const pageParam = request.nextUrl.searchParams.get("page")?.trim() || "1";
    const page = Math.max(1, Number(pageParam) || 1);

    const upstreamUrl = new URL("https://flickreels.dramabos.my.id/api/home");
    upstreamUrl.searchParams.set("lang", "6");
    upstreamUrl.searchParams.set("page", String(page));

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
        `Failed to fetch Flickreels home. status=${response.status}`,
      );
    }

    const payload = (await response.json()) as FlickreelsHomeResponse;
    const rawList = Array.isArray(payload?.data?.data) ? payload.data.data : [];

    const dramas = rawList.map((item, index) => normalizeDrama(item, index));

    return NextResponse.json(dramas, { status: 200 });
  } catch (error) {
    console.error("Flickreels home error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Flickreels home.",
      },
      { status: 500 },
    );
  }
}