import { NextResponse } from "next/server";
import type { Drama } from "@/types/drama";

const NETSHORT_THEATERS_URL =
  "https://netshort.sansekai.my.id/api/netshort/theaters";

type NetshortDramaMeta = {
  netshortRawId?: string;
  netshortDramaId?: string;
};

type TheaterGroup = {
  groupId?: string | number | null;
  contentName?: string;
  contentInfos?: TheaterItem[];
};

type TheaterItem = {
  id?: string | number | null;
  shortPlayId?: string | number | null;
  shortPlayLibraryId?: string | number | null;
  shortPlayName?: string | null;
  shortPlayLabels?: string | null;
  labelArray?: string[] | null;
  isNewLabel?: boolean | null;
  shortPlayCover?: string | null;
  groupShortPlayCover?: string | null;
  contentModel?: number | null;
  heatScore?: string | number | null;
  heatScoreShow?: string | null;
  totalReserveNum?: string | null;
  publishTime?: number | string | null;
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

function createStableNumericId(seed: string, fallback: number): number {
  if (!seed.trim()) return fallback;

  let value = 7;
  for (const ch of seed) {
    value = (value * 31 + ch.charCodeAt(0)) % 2147483647;
  }

  return value > 0 ? value : fallback;
}

function normalizeLabels(item: TheaterItem): string[] {
  if (Array.isArray(item.labelArray) && item.labelArray.length > 0) {
    const labels = item.labelArray
      .map((label) => toStringValue(label))
      .filter(Boolean)
      .slice(0, 8);

    if (labels.length > 0) return labels;
  }

  const raw = toStringValue(item.shortPlayLabels);
  if (!raw) return ["Teater", "Drama"];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const labels = parsed
        .map((label) => toStringValue(label))
        .filter(Boolean)
        .slice(0, 8);

      if (labels.length > 0) return labels;
    }
  } catch {
    // ignore malformed JSON string
  }

  return ["Teater", "Drama"];
}

function flattenGroups(payload: unknown): Array<{
  groupId: string;
  groupName: string;
  item: TheaterItem;
  itemIndex: number;
}> {
  if (!Array.isArray(payload)) return [];

  const result: Array<{
    groupId: string;
    groupName: string;
    item: TheaterItem;
    itemIndex: number;
  }> = [];

  payload.forEach((group, groupIndex) => {
    if (!group || typeof group !== "object") return;

    const typedGroup = group as TheaterGroup;
    const groupId =
      toStringValue(typedGroup.groupId) || `group-${groupIndex + 1}`;
    const groupName = toStringValue(typedGroup.contentName) || "Teater";
    const contentInfos = Array.isArray(typedGroup.contentInfos)
      ? typedGroup.contentInfos
      : [];

    contentInfos.forEach((item, itemIndex) => {
      if (!item || typeof item !== "object") return;

      result.push({
        groupId,
        groupName,
        item,
        itemIndex,
      });
    });
  });

  return result;
}

function normalizeDrama(
  entry: {
    groupId: string;
    groupName: string;
    item: TheaterItem;
    itemIndex: number;
  },
  flatIndex: number,
): Drama & NetshortDramaMeta {
  const { groupId, groupName, item, itemIndex } = entry;

  const netshortRawId =
    toStringValue(item.shortPlayId) ||
    toStringValue(item.shortPlayLibraryId) ||
    toStringValue(item.id) ||
    "";

  const uniqueSeed = `${groupId}:${netshortRawId || "no-id"}:${itemIndex}:${flatIndex}`;

  const fallbackNumericId =
    toNumberValue(item.shortPlayId) ||
    toNumberValue(item.shortPlayLibraryId) ||
    toNumberValue(item.id) ||
    flatIndex + 1;

  const normalizedId = createStableNumericId(uniqueSeed, fallbackNumericId);

  const title = toStringValue(item.shortPlayName) || "Tanpa Judul";
  const cover =
    toStringValue(item.shortPlayCover) ||
    toStringValue(item.groupShortPlayCover) ||
    "";

  const tags = Array.from(
    new Set([...normalizeLabels(item), "Teater", "Drama"]),
  ).slice(0, 8);

  return {
    id: normalizedId,
    source: "Netshort",
    sourceId: "5",
    sourceName: "Netshort",
    title,
    episodes: 0,
    badge: "Teater",
    tags,
    posterClass: "from-[#10203A] via-[#12131A] to-[#090B12]",
    slug: netshortRawId
      ? `netshort-${groupId}-${netshortRawId}`
      : `netshort-${groupId}-${normalizedId}`,
    description: groupName || "Teater Netshort",
    coverImage: cover || undefined,
    posterImage: cover || undefined,
    category: "Teater",
    language: "in",
    country: undefined,
    isNew: Boolean(item.isNewLabel),
    isDubbed: false,
    isTrending: false,
    sortOrder: flatIndex,
    rating: undefined,
    releaseYear: undefined,

    // penting: raw id asli tetap dipakai untuk route episode
    netshortRawId: netshortRawId || undefined,
    netshortDramaId: netshortRawId || undefined,
  };
}

export async function GET() {
  try {
    const response = await fetch(NETSHORT_THEATERS_URL, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        Origin: "https://netshort.sansekai.my.id",
        Referer: "https://netshort.sansekai.my.id/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");

      return NextResponse.json(
        {
          error: `Failed to load Netshort theaters. status=${response.status}`,
          body,
        },
        { status: response.status },
      );
    }

    const payload = await response.json();
    const flattened = flattenGroups(payload);
    const dramas = flattened.map((entry, index) => normalizeDrama(entry, index));

    return NextResponse.json(dramas, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Netshort theaters.",
      },
      { status: 500 },
    );
  }
}