import { NextRequest } from "next/server";

export const PINEDRAMA_BASE =
  process.env.PINEDRAMA_BASE_URL?.trim() ||
  "https://captain.sapimu.au/pinedrama";

export const PINEDRAMA_TOKEN =
  process.env.PINEDRAMA_TOKEN?.trim() || "";

export const PINEDRAMA_LANGUAGE = "id";
export const PINEDRAMA_REGION = "ID";

export function getString(value: unknown): string {
  if (value == null) return "";
  return String(value).trim();
}

export function getLang(
  req?: NextRequest,
) {
  return (
    req?.nextUrl.searchParams.get("language") ||
    PINEDRAMA_LANGUAGE
  );
}

export async function pinedramaFetch<T>(
  path: string,
): Promise<T> {
  const response = await fetch(
    `${PINEDRAMA_BASE}${path}`,
    {
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
        Authorization: `Bearer ${PINEDRAMA_TOKEN}`,
        Referer: "https://captain.sapimu.au/",
        Origin: "https://captain.sapimu.au",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `PineDrama upstream ${response.status}`,
    );
  }

  return response.json();
}

export async function fetchPineDramaPlay(
  collectionId: string,
  episode: number,
) {
  const qs = new URLSearchParams({
    collection_id: collectionId,
    episode: String(episode),
    language: PINEDRAMA_LANGUAGE,
    region: PINEDRAMA_REGION,
  });

  return pinedramaFetch<any>(
    `/api/drama/play?${qs.toString()}`,
  );
}


export function mapPineDramaCollection(
  item: any,
) {
  const collectionId = String(
    item?.collectionId || "",
  ).trim();

  const numericId = Number(
    collectionId.slice(-12),
  );

  return {
    id:
      Number.isFinite(numericId) && numericId > 0
        ? numericId
        : Date.now(),

    source: "PineDrama",
    sourceId: "21",
    sourceName: "PineDrama",

    title:
      item?.title ||
      item?.name ||
      "Untitled",

    episodes:
      Number(item?.totalEpisodes || 0),

    badge:
      item?.labels?.hot
        ? "HOT"
        : item?.labels?.new
          ? "NEW"
          : "",

    tags:
      typeof item?.categories === "string"
        ? item.categories
            .split(",")
            .map((v: string) => v.trim())
            .filter(Boolean)
        : [],

    posterClass: "",

    slug: `pinedrama-${collectionId}`,

    description:
      item?.description || "",

    posterImage:
      item?.cover || "",

    coverImage:
      item?.cover || "",

    category: "Drama",

    isNew:
      Boolean(item?.labels?.new),

    isTrending:
      Boolean(item?.labels?.hot),

    isDubbed: false,

    pinedramaCollectionId:
      collectionId,

    pinedramaRawId:
      collectionId,
  };
}
