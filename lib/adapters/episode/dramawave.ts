import type { Episode } from "@/types/episode";

type AnyRecord = Record<string, unknown>;

type DramawaveEpisodeMeta = {
  dramawaveEpisodeId?: string;
  dramawaveVid?: string;
};

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

function createStableNumericId(seed: string, fallback: number): number {
  if (!seed.trim()) return fallback;

  let value = 11;
  for (const ch of seed) {
    value = (value * 37 + ch.charCodeAt(0)) % 2147483647;
  }

  return value > 0 ? value : fallback;
}

function resolveVideoUrl(raw: AnyRecord): string {
  return (
    pickString(
      raw,
      "m3u8_path",
      "m3u8",
      "url",
      "video_url",
      "play_url",
      "1080p_mp4",
      "720p_mp4",
      "540p_mp4",
    ) || ""
  );
}

function resolveIndonesianSubtitle(raw: AnyRecord): {
  subtitleUrl?: string;
  subtitleLang?: string;
  subtitleLabel?: string;
} {
  const subtitleList = Array.isArray(raw.subtitle_list) ? raw.subtitle_list : [];

  const normalized = subtitleList
    .map((item) => asRecord(item))
    .map((item) => ({
      displayName: pickString(item, "display_name", "label", "name"),
      language: pickString(item, "language", "lang"),
      subtitle: pickString(item, "subtitle", "url", "src"),
      type: pickString(item, "type"),
    }))
    .filter((item) => item.subtitle);

  const indonesian =
    normalized.find(
      (item) =>
        item.language.toLowerCase() === "id-id" ||
        item.language.toLowerCase() === "id" ||
        item.displayName.toLowerCase() === "indonesian",
    ) ||
    normalized.find((item) => item.type.toLowerCase() === "original") ||
    null;

  if (!indonesian) {
    return {};
  }

  return {
    subtitleUrl: indonesian.subtitle,
    subtitleLang: indonesian.language || "id-ID",
    subtitleLabel: indonesian.displayName || "Indonesian",
  };
}

export function normalizeDramawaveEpisodes(
  payload: unknown,
  numericDramaId: number,
): Episode[] {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const items = Array.isArray(data.items)
    ? data.items
    : Array.isArray(root.items)
      ? root.items
      : [];

  return items
    .map((item, index) => {
      const raw = asRecord(item);
      const episodeId =
        pickString(raw, "id", "episode_id", "vid", "playlet_id") || "";
      const episodeNumber =
        pickNumber(raw, "serial_number", "episode", "episode_number") ||
        index + 1;
      const videoUrl = resolveVideoUrl(raw);
      const title =
        pickString(raw, "title", "name") || `Episode ${episodeNumber}`;
      const duration = pickString(raw, "duration", "time_len");
      const isVipOnly = pickString(raw, "video_type").toLowerCase() === "charge";
      const subtitleMeta = resolveIndonesianSubtitle(raw);

      return {
        id: createStableNumericId(
          `${numericDramaId}-${episodeId || episodeNumber}`,
          numericDramaId * 1000 + episodeNumber,
        ),
        dramaId: numericDramaId,
        title,
        episodeNumber,
        duration: duration || "",
        videoUrl,
        isLocked: isVipOnly,
        isVipOnly,
        dramawaveEpisodeId: episodeId || undefined,
        dramawaveVid: episodeId || undefined,
        thumbnail: pickString(raw, "cover", "thumbnail", "thumb") || undefined,
        subtitleUrl: subtitleMeta.subtitleUrl,
        subtitleLang: subtitleMeta.subtitleLang,
        subtitleLabel: subtitleMeta.subtitleLabel,
        sortOrder: episodeNumber,
      } as Episode & DramawaveEpisodeMeta;
    })
    .sort((a, b) => a.episodeNumber - b.episodeNumber);
}