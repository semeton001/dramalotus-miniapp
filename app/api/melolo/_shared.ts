import { NextRequest, NextResponse } from "next/server";

const MELOLO_BASE_URL =
  process.env.MELOLO_BASE_URL?.trim() || "https://captain.sapimu.au/melolo";

const MELOLO_TOKEN = process.env.MELOLO_TOKEN?.trim() || "";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

type JsonRecord = Record<string, any>;

function headers(): HeadersInit {
  return {
    Accept: "application/json, text/plain, */*",
    Authorization: `Bearer ${MELOLO_TOKEN}`,
    "User-Agent": UA,
  };
}

async function fetchJson(path: string) {
  const res = await fetch(`${MELOLO_BASE_URL}${path}`, {
    method: "GET",
    cache: "no-store",
    headers: headers(),
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Melolo upstream failed ${res.status}: ${text.slice(0, 300)}`);
  }

  if (!text.trim()) {
    throw new Error("Empty Melolo response");
  }

  return JSON.parse(text);
}

function createStableNumericId(seed: string, fallback = 1): number {
  let value = 7;
  for (const ch of seed) {
    value = (value * 31 + ch.charCodeAt(0)) % 2147483647;
  }
  return value || fallback;
}

function normalizeMeloloImage(url: unknown): string {
  if (typeof url !== "string" || !url.trim()) {
    return "";
  }

  const raw = url.trim();

  if (raw.toLowerCase().includes(".heic")) {
    return `https://wsrv.nl/?url=${encodeURIComponent(raw)}&output=webp`;
  }

  return raw;
}

function toDrama(item: JsonRecord, index = 0) {
  const id = String(item.id || item.book_id || item.bookId || item.key || "");

  return {
    id: createStableNumericId(id || `melolo-${index}`, index + 1),
    source: "melolo",
    sourceId: "17",
    sourceName: "Melolo",
    title: item.title || item.name || item.book_name || "Untitled",
    episodes: Number(
      item.total_episode ||
      item.episode_count ||
      item.total ||
      item.last_chapter_index ||
      item.serial_count ||
      0
    ),
    badge: "Melolo",
    tags: Array.isArray(item.tags) ? item.tags : [],
    slug: `melolo-${id}`,
    description: item.description || item.desc || item.abstract || "",
    coverImage: normalizeMeloloImage(item.cover || item.poster || item.image || item.thumb_url || ""),
    posterImage: normalizeMeloloImage(item.cover || item.poster || item.image || item.thumb_url || ""),
    category: item.category || "Drama",
    language: "id",
    isNew: false,
    isDubbed: false,
    isTrending: false,
    sortOrder: index,
    meloloRawId: id,
    meloloDramaId: id,
  };
}

function toEpisode(dramaId: string, item: JsonRecord) {
  const ep = Number(item.index || 1);

  return {
    id: createStableNumericId(`${dramaId}:${ep}`, ep),
    dramaId: 0,
    episodeNumber: ep,
    title: `Episode ${ep}`,
    duration: item.duration ? String(item.duration) : "",
    slug: `melolo-${dramaId}-ep-${ep}`,
    description: "",
    thumbnail: item.cover || "",
    videoUrl: `/api/melolo/stream?dramaId=${encodeURIComponent(dramaId)}&episode=${ep}`,
    originalVideoUrl: "",
    isLocked: false,
    isVipOnly: false,
    sortOrder: ep,
    meloloVid: item.vid || undefined,
  };
}

async function fetchMultiVideo(dramaId: string) {
  return fetchJson(`/api/v1/multi-video?id=${encodeURIComponent(dramaId)}&lang=id`);
}

export async function respondHome(_request: NextRequest) {
  const payload = await fetchJson("/api/v1/bookmall?lang=id");

  const items = Array.isArray(payload?.cell?.cell_data)
    ? payload.cell.cell_data.flatMap((x: JsonRecord) =>
        Array.isArray(x?.books) ? x.books : []
      )
    : [];

  return NextResponse.json({
    items: items.map((x: JsonRecord, i: number) => toDrama(x, i)),
    hasNextPage: false,
    page: 1,
  });
}

export async function respondSearch(request: NextRequest) {
  const q =
    request.nextUrl.searchParams.get("q")?.trim() ||
    request.nextUrl.searchParams.get("query")?.trim() ||
    "";

  if (!q) {
    return NextResponse.json([]);
  }

  const payload = await fetchJson(
    `/api/v1/search?q=${encodeURIComponent(q)}&lang=id&limit=100&offset=0`
  );

  const items = Array.isArray(payload?.items)
    ? payload.items
    : [];

  return NextResponse.json(items.map((x: JsonRecord, i: number) => toDrama(x, i)));
}

export async function respondDetail(request: NextRequest) {
  const id =
    request.nextUrl.searchParams.get("id") ||
    request.nextUrl.searchParams.get("dramaId") ||
    "";

  if (!id.trim()) {
    return NextResponse.json({ error: "Missing dramaId" }, { status: 400 });
  }

  const payload = await fetchJson(
    `/api/v1/book?id=${encodeURIComponent(id)}&lang=id`
  );

  const item = payload?.data || payload;

  return NextResponse.json(toDrama(item, 0));
}

export async function respondEpisodes(request: NextRequest) {
  const id =
    request.nextUrl.searchParams.get("id") ||
    request.nextUrl.searchParams.get("dramaId") ||
    "";

  if (!id.trim()) {
    return NextResponse.json([], { status: 400 });
  }

  const payload = await fetchMultiVideo(id);

  const episodes = Array.isArray(payload?.episodes)
    ? payload.episodes
    : [];

  return NextResponse.json(
    episodes
      .map((x: JsonRecord) => toEpisode(id, x))
      .sort((a: any, b: any) => a.episodeNumber - b.episodeNumber)
  );
}

export async function respondStream(request: NextRequest) {
  const dramaId = request.nextUrl.searchParams.get("dramaId") || "";
  const episode = Number(request.nextUrl.searchParams.get("episode") || "1");

  if (!dramaId) {
    return NextResponse.json({ error: "Missing dramaId" }, { status: 400 });
  }

  const payload = await fetchMultiVideo(dramaId);

  const episodes = Array.isArray(payload?.episodes)
    ? payload.episodes
    : [];

  const match = episodes.find((x: JsonRecord) => Number(x.index) === episode);

  if (!match?.stream_url) {
    return NextResponse.json({ error: "Stream not found" }, { status: 404 });
  }

  const upstream = await fetch(match.stream_url, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Accept: "*/*",
      Referer: "https://www.melolo.com/",
    },
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Failed to fetch upstream stream" },
      { status: upstream.status || 502 },
    );
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type":
        upstream.headers.get("content-type") || "video/mp4",
      "Content-Length":
        upstream.headers.get("content-length") || "",
      "Accept-Ranges":
        upstream.headers.get("accept-ranges") || "bytes",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });
}


export async function respondFeed(
  request: NextRequest,
  _mode: "home" | "romance" | "foryou" | "pewaris",
) {
  return respondHome(request);
}
