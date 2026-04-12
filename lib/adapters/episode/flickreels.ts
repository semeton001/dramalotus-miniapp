import type { Episode } from "@/types/episode";

type NormalizeFlickreelsEpisodesOptions = {
  dramaId: string;
  numericDramaId: number;
  streamProxyBasePath?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function pickString(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function pickNumber(raw: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = raw[key];
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

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function looksLikePlayableUrl(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    looksLikeAbsoluteUrl(value) &&
    (lower.includes(".m3u8") ||
      lower.includes(".mp4") ||
      lower.includes("playlet-hls") ||
      lower.includes("playlet-hls-ims"))
  );
}

function normalizeDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "--:--";

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainder = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function buildFallbackMediaUrl(playUrl: string, originUrl: string): string {
  if (!originUrl.trim()) return "";
  if (looksLikeAbsoluteUrl(originUrl)) return originUrl.trim();

  const safePlayUrl = playUrl.trim();
  if (!safePlayUrl) return "";

  try {
    const base = new URL(safePlayUrl);
    return new URL(
      originUrl.trim(),
      `${base.protocol}//${base.host}`,
    ).toString();
  } catch {
    return "";
  }
}

function buildStreamProxyUrl(rawUrl: string, basePath: string): string {
  if (!looksLikeAbsoluteUrl(rawUrl)) return rawUrl;
  return `${basePath}?url=${encodeURIComponent(rawUrl)}`;
}

export function normalizeFlickreelsEpisodes(
  payload: unknown,
  options: NormalizeFlickreelsEpisodesOptions,
): Episode[] {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const rawList = Array.isArray(data.list) ? data.list : [];

  const episodes = rawList
    .map((item, index): Episode | null => {
      const raw = asRecord(item);
      const episodeNumber =
        pickNumber(
          raw,
          "chapter_num",
          "episode_num",
          "episodeNumber",
          "sort",
        ) || index + 1;
      const chapterId = pickString(raw, "chapter_id", "chapterId", "id");
      const chapterTitle = stripHtml(
        pickString(raw, "chapter_title", "title", "name") ||
          `Episode ${episodeNumber}`,
      );
      const playUrl = pickString(
        raw,
        "play_url",
        "playUrl",
        "video_url",
        "videoUrl",
      );
      const originUrl = pickString(raw, "origin_url", "originUrl");
      const fallbackMediaUrl = buildFallbackMediaUrl(playUrl, originUrl);
      const bestRawVideoUrl = looksLikePlayableUrl(playUrl)
        ? playUrl
        : looksLikePlayableUrl(fallbackMediaUrl)
          ? fallbackMediaUrl
          : "";

      if (!bestRawVideoUrl) {
        return null;
      }

      const useProxy =
        options.streamProxyBasePath && looksLikeAbsoluteUrl(bestRawVideoUrl);
      const videoUrl = useProxy
        ? buildStreamProxyUrl(bestRawVideoUrl, options.streamProxyBasePath!)
        : bestRawVideoUrl;

      return {
        id: options.numericDramaId * 1000 + episodeNumber,
        dramaId: options.numericDramaId,
        episodeNumber,
        title: chapterTitle,
        duration: normalizeDuration(pickNumber(raw, "duration", "play_time")),
        slug: `flickreels-${options.dramaId}-${episodeNumber}`,
        description: undefined,
        videoUrl,
        thumbnail:
          pickString(raw, "chapter_cover", "cover", "thumbnail", "poster") ||
          undefined,
        isLocked: pickNumber(raw, "is_lock") === 1,
        isVipOnly: pickNumber(raw, "is_vip_episode") === 1,
        sortOrder: episodeNumber,
        subtitleUrl: undefined,
        subtitleLang: undefined,
        subtitleLabel: undefined,
        flickreelsEpisodeId: chapterId || `${options.dramaId}-${episodeNumber}`,
        flickreelsVid: chapterId || undefined,
      };
    })
    .filter((item): item is Episode => item !== null)
    .sort((a, b) => a.episodeNumber - b.episodeNumber);

  return episodes;
}
