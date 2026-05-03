import type { Drama } from "@/types/drama";

type DramawaveMode =
  | "home"
  | "foryou"
  | "anime"
  | "random"
  | "search"
  | "latest"
  | "dubbing"
  | "vip";

type DramawaveDramaMeta = {
  dramawaveRawId?: string;
  dramawaveDramaId?: string;
};

type AnyRecord = Record<string, unknown>;

function asRecord(value: unknown): AnyRecord {
  return value && typeof value === "object" ? (value as AnyRecord) : {};
}

function pickString(record: AnyRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function pickNumber(record: AnyRecord, ...keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value
      .split(/[|,/]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function createStableNumericId(seed: string, fallback: number): number {
  if (!seed.trim()) return fallback;

  let value = 7;
  for (const ch of seed) {
    value = (value * 31 + ch.charCodeAt(0)) % 2147483647;
  }

  return value > 0 ? value : fallback;
}

function resolveBadge(mode: DramawaveMode): string {
  switch (mode) {
    case "foryou":
      return "ForYou";
    case "anime":
      return "Anime";
    case "random":
      return "Acak";
    case "latest":
      return "Terbaru";
    case "dubbing":
      return "Dubbing";
    case "vip":
      return "VIP";
    default:
      return "Dramawave";
  }
}

function resolveCategory(mode: DramawaveMode): string {
  if (mode === "anime") return "Anime";
  if (mode === "dubbing") return "Dubbing";
  if (mode === "vip") return "VIP";
  return "Drama";
}

export function buildDramawaveDrama(
  item: unknown,
  index: number,
  mode: DramawaveMode,
  sourceId = "4",
): Drama {
  const raw = asRecord(item);

  const rawId =
    pickString(
      raw,
      "key",
      "playlet_id",
      "playletId",
      "id",
      "book_id",
      "bookId",
      "drama_id",
      "dramaId",
    ) || "";

  const episodeInfoForCover = asRecord(raw.episode_info);

  const cover =
    pickString(
      raw,
      "cover",
      "cover_url",
      "poster",
      "poster_url",
      "image",
      "image_url",
      "thumbnail",
      "thumb",
    ) ||
    pickString(episodeInfoForCover, "cover", "poster", "thumbnail") ||
    "";

  const episodeInfo = asRecord(raw.episode_info);

  const title =
    pickString(raw, "name", "title", "book_name", "bookName") ||
    pickString(episodeInfo, "name", "title") ||
    "Tanpa Judul";

  const desc =
    pickString(raw, "desc", "description", "intro", "summary", "abstract") || "";

  const episodeCount = pickNumber(
    raw,
    "episode_count",
    "episodes",
    "episodeCount",
    "serial_count",
  );

  const tags = Array.from(
    new Set([
      ...normalizeStringArray(raw.tag),
      ...normalizeStringArray(raw.series_tag),
      ...normalizeStringArray(raw.content_tags),
      ...normalizeStringArray(raw.content_detail_tags),
      ...normalizeStringArray(raw.tags),
      ...normalizeStringArray(raw.category),
      ...normalizeStringArray(raw.genre),
      ...(mode === "anime" ? ["Anime"] : []),
      ...(mode === "latest" ? ["Terbaru"] : []),
      ...(mode === "dubbing" ? ["Dubbing"] : []),
      ...(mode === "vip" ? ["VIP"] : []),
      "Drama",
    ]),
  ).slice(0, 8);

  const numericId = createStableNumericId(
    rawId || `dramawave-${title}-${index}`,
    Date.now() + index,
  );

  return {
    id: numericId,
    source: "Dramawave",
    sourceId,
    sourceName: "Dramawave",
    title,
    episodes: episodeCount,
    badge: resolveBadge(mode),
    tags,
    posterClass: "from-[#20103A] via-[#12131A] to-[#090B12]",
    slug: rawId ? `dramawave-${rawId}` : `dramawave-${numericId}`,
    description: desc,
    coverImage: cover || undefined,
    posterImage: cover || undefined,
    category: resolveCategory(mode),
    language: "in",
    country: undefined,
    isNew: mode === "home" || mode === "latest",
    isDubbed:
      mode === "dubbing" ||
      title.toLowerCase().includes("dub") ||
      title.toLowerCase().includes("sulih suara"),
    isTrending: false,
    sortOrder: index,
    rating: undefined,
    releaseYear: undefined,
    dramawaveRawId: rawId || undefined,
    dramawaveDramaId: rawId || undefined,
  } as Drama & DramawaveDramaMeta;
}

export function extractDramawaveFeedItems(payload: unknown): unknown[] {
  const root = asRecord(payload);
  const data = asRecord(root.data);

  const directItems = Array.isArray(data.items)
    ? data.items
    : Array.isArray(root.items)
      ? root.items
      : [];

  if (directItems.length > 0) {
    const nestedItems = directItems.flatMap((item) => {
      const record = asRecord(item);
      const type = pickString(record, "type").toLowerCase();
      const moduleName = pickString(record, "module_name").toLowerCase();

      if (
        type === "coming_soon" ||
        moduleName.includes("segera hadir") ||
        moduleName.includes("coming soon")
      ) {
        return [];
      }

      return Array.isArray(record.items) ? record.items : [];
    });

    if (nestedItems.length > 0) {
      return nestedItems;
    }

    return directItems;
  }

  const sections = Array.isArray(data.data)
    ? data.data
    : Array.isArray(root.data)
      ? (root.data as unknown[])
      : [];

  return sections.flatMap((section) => {
    const sectionRecord = asRecord(section);
    return Array.isArray(sectionRecord.items) ? sectionRecord.items : [];
  });
}

export function normalizeDramawaveFeed(
  payload: unknown,
  mode: DramawaveMode,
  sourceId = "4",
): Drama[] {
  const items = extractDramawaveFeedItems(payload);

  return items
    .map((item, index) => buildDramawaveDrama(item, index, mode, sourceId))
    .filter((item): item is Drama => {
      if (!item) return false;

      const title = item.title.trim().toLowerCase();

      if (item.episodes <= 0) return false;
      if (title === "top") return false;
      if (title === "tanpa judul") return false;

      return true;
    });
}
