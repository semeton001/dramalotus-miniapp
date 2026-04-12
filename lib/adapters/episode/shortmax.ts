type ShortmaxEpisode = {
  id: number;
  dramaId: number;
  episodeNumber: number;
  title: string;
  videoUrl: string;
  subtitleUrl?: string;
  subtitleLang?: string;
  subtitleLabel?: string;
  originalVideoUrl?: string;
};

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
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function createStableNumericId(seed: string, fallback: number): number {
  if (!seed.trim()) return fallback;

  let value = 7;
  for (const ch of seed) {
    value = (value * 31 + ch.charCodeAt(0)) % 2147483647;
  }

  return value > 0 ? value : fallback;
}

function extractCandidateEpisodeArrays(
  payload: unknown,
): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];

  const buckets: unknown[] = [(payload as { data?: unknown }).data, payload];

  for (const bucket of buckets) {
    if (!bucket || typeof bucket !== "object") continue;
    const obj = bucket as Record<string, unknown>;

    for (const key of [
      "episodes",
      "episodeList",
      "episode_list",
      "chapterList",
      "chapter_list",
      "list",
      "videos",
      "videoList",
      "video_list",
      "items",
      "playList",
      "play_list",
    ]) {
      if (Array.isArray(obj[key])) {
        return obj[key] as Record<string, unknown>[];
      }
    }
  }

  return [];
}

function resolveEpisodeVideoUrl(raw: Record<string, unknown>): string {
  return pickString(
    raw,
    "videoUrl",
    "video_url",
    "playUrl",
    "play_url",
    "url",
    "mp4",
    "hls",
    "hlsUrl",
    "hls_url",
    "m3u8",
  );
}

function resolveEpisodeSubtitleUrl(raw: Record<string, unknown>): string {
  return pickString(
    raw,
    "subtitleUrl",
    "subtitle_url",
    "subUrl",
    "sub_url",
    "srt",
    "vtt",
    "captionUrl",
    "caption_url",
  );
}

export function normalizeShortmaxEpisodes(
  payload: unknown,
  numericDramaId: number,
): ShortmaxEpisode[] {
  return extractCandidateEpisodeArrays(payload)
    .map((item, index): ShortmaxEpisode | null => {
      const episodeNumber =
        pickNumber(
          item,
          "episodeNumber",
          "episode_number",
          "episode",
          "ep",
          "sort",
          "index",
          "seq",
        ) || index + 1;

      const originalVideoUrl = resolveEpisodeVideoUrl(item);
      const subtitleOriginal = resolveEpisodeSubtitleUrl(item);

      if (!originalVideoUrl) return null;

      return {
        id: createStableNumericId(
          `${numericDramaId}-${episodeNumber}-${originalVideoUrl}`,
          numericDramaId * 1000 + episodeNumber,
        ),
        dramaId: numericDramaId,
        episodeNumber,
        title:
          pickString(item, "title", "name", "episodeTitle", "episode_title") ||
          `Episode ${episodeNumber}`,
        videoUrl: `/api/shortmax/stream?u=${encodeURIComponent(originalVideoUrl)}`,
        subtitleUrl: subtitleOriginal
          ? `/api/shortmax/subtitle?url=${encodeURIComponent(subtitleOriginal)}`
          : undefined,
        subtitleLang: "id-ID",
        subtitleLabel: "Indonesian",
        originalVideoUrl,
      };
    })
    .filter((item): item is ShortmaxEpisode => item !== null)
    .sort((a, b) => a.episodeNumber - b.episodeNumber);
}
