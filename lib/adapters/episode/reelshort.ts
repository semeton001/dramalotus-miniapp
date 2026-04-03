import type { Episode } from "@/types/episode";

function pickString(
  record: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

function pickNumber(
  record: Record<string, unknown>,
  ...keys: string[]
): number {
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

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function extractArray(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.map(toRecord);
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const candidates = [
      record.episodes,
      record.chapters,
      record.data,
      record.items,
      record.results,
      record.list,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate.map(toRecord);
      }
    }
  }

  return [];
}

function getBestStreamUrl(record: Record<string, unknown>): string {
  const streams = record.streams;

  if (!Array.isArray(streams)) return "";

  const urls = streams
    .map((stream) => {
      if (!stream || typeof stream !== "object") return "";
      const value = (stream as Record<string, unknown>).url;
      return typeof value === "string" ? value.trim() : "";
    })
    .filter(Boolean);

  if (urls.length === 0) return "";

  const vodUrl = urls.find((url) => url.includes("/vod-")) || "";
  if (vodUrl) return vodUrl;

  const videoUrl = urls.find((url) => url.includes("/video/")) || "";
  if (videoUrl) return videoUrl;

  return urls[0] ?? "";
}

function formatDuration(value: number): string {
  return value > 0 ? String(value) : "";
}

export function adaptReelShortEpisodes(
  payload: unknown,
  dramaId: number,
): Episode[] {
  const items = extractArray(payload);

  return items.map((record, index): Episode => {
    const episodeNumber =
      pickNumber(
        record,
        "episode",
        "episodeNo",
        "episode_num",
        "sort",
        "index",
        "chapterNo",
      ) || index + 1;

    const url =
      getBestStreamUrl(record) ||
      pickString(
        record,
        "playUrl",
        "videoUrl",
        "video_url",
        "url",
        "mediaUrl",
        "streamUrl",
      );

    const stableId = episodeNumber + dramaId * 1000;
    const locked = pickNumber(record, "is_lock") === 1;

    return {
      id: stableId,
      dramaId,
      title:
        pickString(record, "name", "title", "episodeTitle") ||
        `Episode ${episodeNumber}`,
      episodeNumber,
      duration: formatDuration(pickNumber(record, "duration")),
      videoUrl: url || undefined,
      thumbnail:
        pickString(record, "cover", "thumbnail", "thumb", "image") || undefined,
      isLocked: locked,
      isVipOnly: locked,
      sortOrder: episodeNumber,
    };
  });
}
