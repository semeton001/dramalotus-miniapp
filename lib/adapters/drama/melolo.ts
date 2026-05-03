import type { Drama } from "@/types/drama";

type MeloloHomeBook = {
  book_id?: string | number;
  book_name?: string;
  abstract?: string;
  thumb_url?: string;
  serial_count?: string | number;
  is_new_book?: string | number;
  is_dubbed?: string | number;
  is_hot?: string | number;
  stat_infos?: string[];
  category_info?: string;
  create_time?: string;
  language?: string;
  [key: string]: unknown;
};

type MeloloSearchItem = {
  id?: string | number;
  book_id?: string | number;
  name?: string;
  title?: string;
  book_name?: string;
  intro?: string;
  abstract?: string;
  cover?: string;
  thumb_url?: string;
  episodes?: string | number;
  serial_count?: string | number;
  author?: string;
  source?: string;
  status?: string;
  language?: string;
  [key: string]: unknown;
};

type MeloloCategoryInfoItem = {
  Name?: string;
  [key: string]: unknown;
};

type MeloloDetailPayload = {
  id?: string | number;
  title?: string;
  intro?: string;
  cover?: string;
  episodes?: string | number;
  videos?: unknown[];
  [key: string]: unknown;
};

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function asBooleanLike(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "1" || normalized === "true";
  }
  return false;
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    const str = asString(value).trim();
    if (str) return str;
  }
  return "";
}

function proxyMeloloImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("/api/melolo/image?")) return trimmed;

  return `/api/melolo/image?url=${encodeURIComponent(trimmed)}`;
}

function createStableNumericId(seed: string, fallback = 0): number {
  if (!seed.trim()) return fallback;

  let value = 7;
  for (const ch of seed) {
    value = (value * 31 + ch.charCodeAt(0)) % 2147483647;
  }

  return value > 0 ? value : fallback;
}

function parseCategoryInfoNames(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => (item as MeloloCategoryInfoItem)?.Name)
      .filter(
        (name): name is string =>
          typeof name === "string" && name.trim().length > 0,
      )
      .map((name) => name.trim());
  } catch {
    return [];
  }
}

function normalizeHomeTags(book: MeloloHomeBook): string[] {
  const statInfos = Array.isArray(book.stat_infos)
    ? book.stat_infos
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  const categoryNames = parseCategoryInfoNames(book.category_info);

  return Array.from(new Set([...statInfos, ...categoryNames, "Drama"])).slice(
    0,
    8,
  );
}

function adaptMeloloHomeBook(book: MeloloHomeBook, index: number): Drama {
  const meloloDramaId = firstNonEmptyString(book.book_id);
  const title = firstNonEmptyString(book.book_name, "Tanpa Judul");
  const description = firstNonEmptyString(book.abstract);
  const posterImage = proxyMeloloImageUrl(firstNonEmptyString(book.thumb_url, book.first_chapter_cover));
  const episodeCount = asNumber(book.serial_count, 0);
  const stableId = createStableNumericId(
    meloloDramaId || title,
    episodeCount || index + 1,
  );
  const tags = normalizeHomeTags(book);

  return {
    id: stableId,
    source: "melolo",
    sourceId: "3",
    sourceName: "Melolo",
    title,
    episodes: episodeCount,
    badge: "Melolo",
    tags,
    posterClass: "from-[#35101F] via-[#12131A] to-[#090B12]",
    slug: meloloDramaId ? `melolo-${meloloDramaId}` : `melolo-${stableId}`,
    description,
    coverImage: posterImage || undefined,
    posterImage: posterImage || undefined,
    category: "Drama",
    language: firstNonEmptyString(book.language, "id"),
    country: undefined,
    isNew: asBooleanLike(book.is_new_book),
    isDubbed: asBooleanLike(book.is_dubbed),
    isTrending: asBooleanLike(book.is_hot),
    sortOrder: index,
    rating: undefined,
    releaseYear: undefined,
    meloloRawId: meloloDramaId || undefined,
    meloloDramaId: meloloDramaId || undefined,
  };
}

function adaptMeloloSearchItem(item: MeloloSearchItem, index: number): Drama {
  const meloloDramaId = firstNonEmptyString(item.id, item.book_id);
  const title = firstNonEmptyString(item.name, item.title, item.book_name, "Tanpa Judul");
  const description = firstNonEmptyString(item.intro, item.abstract);
  const posterImage = proxyMeloloImageUrl(firstNonEmptyString(item.cover, item.thumb_url));
  const episodeCount = asNumber(item.episodes, asNumber(item.serial_count, 0));
  const stableId = createStableNumericId(
    meloloDramaId || title,
    episodeCount || index + 1,
  );

  const tags = Array.from(
    new Set([
      firstNonEmptyString(item.author),
      firstNonEmptyString(item.source),
      firstNonEmptyString(item.status),
      "Drama",
    ].filter(Boolean)),
  ).slice(0, 8);

  return {
    id: stableId,
    source: "melolo",
    sourceId: "3",
    sourceName: "Melolo",
    title,
    episodes: episodeCount,
    badge: "Melolo",
    tags,
    posterClass: "from-[#35101F] via-[#12131A] to-[#090B12]",
    slug: meloloDramaId ? `melolo-${meloloDramaId}` : `melolo-${stableId}`,
    description,
    coverImage: posterImage || undefined,
    posterImage: posterImage || undefined,
    category: "Drama",
    language: "id",
    country: undefined,
    isNew: false,
    isDubbed:
      title.toLowerCase().includes("(dub)") ||
      title.toLowerCase().includes("dub"),
    isTrending: false,
    sortOrder: index,
    rating: undefined,
    releaseYear: undefined,
    meloloRawId: meloloDramaId || undefined,
    meloloDramaId: meloloDramaId || undefined,
  };
}

function extractHomeBooks(payload: unknown): MeloloHomeBook[] {
  if (!payload || typeof payload !== "object") return [];

  const root = payload as Record<string, unknown>;
  const books: MeloloHomeBook[] = [];

  const pushBooksFromCellData = (cellData: unknown) => {
    if (!Array.isArray(cellData)) return;

    for (const item of cellData) {
      if (!item || typeof item !== "object") continue;

      const typedItem = item as Record<string, unknown>;
      const itemBooks = Array.isArray(typedItem.books) ? typedItem.books : [];

      for (const book of itemBooks) {
        if (book && typeof book === "object") {
          books.push(book as MeloloHomeBook);
        }
      }
    }
  };

  const data = root.data as Record<string, unknown> | undefined;
  const rootCell = root.cell as Record<string, unknown> | undefined;
  const dataCell = data?.cell as Record<string, unknown> | undefined;

  pushBooksFromCellData(rootCell?.cell_data);
  pushBooksFromCellData(dataCell?.cell_data);

  const bookTabInfos = Array.isArray(root.book_tab_infos)
    ? root.book_tab_infos
    : Array.isArray(data?.book_tab_infos)
      ? data?.book_tab_infos
      : [];

  for (const tabInfo of bookTabInfos) {
    if (!tabInfo || typeof tabInfo !== "object") continue;

    const cells = (tabInfo as Record<string, unknown>).cells;
    if (!Array.isArray(cells)) continue;

    for (const cell of cells) {
      if (!cell || typeof cell !== "object") continue;
      pushBooksFromCellData((cell as Record<string, unknown>).cell_data);
    }
  }

  return books;
}

function extractSearchItems(payload: unknown): MeloloSearchItem[] {
  if (!payload || typeof payload !== "object") return [];

  const root = payload as Record<string, unknown>;
  const data = Array.isArray(root.data) ? root.data : [];
  const items = Array.isArray(root.items) ? root.items : [];

  const list = items.length > 0 ? items : data;

  return list.filter(
    (item): item is MeloloSearchItem => !!item && typeof item === "object",
  );
}

export function adaptMeloloDrama(raw: unknown): Drama {
  const book = (raw ?? {}) as MeloloHomeBook;
  return adaptMeloloHomeBook(book, 0);
}

export function adaptMeloloDramaList(rawItems: unknown): Drama[] {
  return extractHomeBooks(rawItems).map((book, index) =>
    adaptMeloloHomeBook(book, index),
  );
}

export function adaptMeloloSearchList(rawItems: unknown): Drama[] {
  return extractSearchItems(rawItems).map((item, index) =>
    adaptMeloloSearchItem(item, index),
  );
}

export function adaptMeloloDramaDetail(
  rawItem: unknown,
): (Partial<Drama> & { id: number }) | null {
  if (!rawItem || typeof rawItem !== "object") {
    return null;
  }

  const detail = rawItem as MeloloDetailPayload;
  const meloloDramaId = firstNonEmptyString(detail.id);
  const title = firstNonEmptyString(detail.title, "Tanpa Judul");
  const description = firstNonEmptyString(detail.intro);
  const cover = firstNonEmptyString(detail.cover);
  const episodeCount = asNumber(detail.episodes, 0);
  const stableId = createStableNumericId(
    meloloDramaId || title,
    episodeCount || 1,
  );

  return {
    id: stableId,
    source: "melolo",
    sourceId: "3",
    sourceName: "Melolo",
    title,
    episodes: episodeCount,
    badge: "Melolo",
    tags: ["Drama"],
    posterClass: "from-[#35101F] via-[#12131A] to-[#090B12]",
    slug: meloloDramaId ? `melolo-${meloloDramaId}` : `melolo-${stableId}`,
    description,
    coverImage: cover || undefined,
    posterImage: cover || undefined,
    category: "Drama",
    language: "id",
    country: undefined,
    isNew: false,
    isDubbed:
      title.toLowerCase().includes("(dub)") ||
      title.toLowerCase().includes("dub"),
    isTrending: false,
    sortOrder: 0,
    rating: undefined,
    releaseYear: undefined,
    meloloRawId: meloloDramaId || undefined,
    meloloDramaId: meloloDramaId || undefined,
  };
}
