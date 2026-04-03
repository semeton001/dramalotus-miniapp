import type { Episode } from "@/types/episode";

type MeloloRawVideo = {
  episode?: string | number;
  vid?: string | number;
  duration?: string | number;
  video_url?: string;
  play_url?: string;
  stream_url?: string;
  url?: string;
  locked?: boolean | number | string;
  is_locked?: boolean | number | string;
  vip?: boolean | number | string;
  is_vip?: boolean | number | string;
  [key: string]: unknown;
};

type MeloloDetailPayload = {
  id?: string | number;
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

function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["1", "true", "yes", "locked", "vip"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", ""].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    const str = asString(value).trim();
    if (str) return str;
  }

  return "";
}

function createStableNumericId(seed: string, fallback = 0): number {
  if (!seed.trim()) return fallback;

  let value = 7;
  for (const ch of seed) {
    value = (value * 31 + ch.charCodeAt(0)) % 2147483647;
  }

  return value > 0 ? value : fallback;
}

function extractVideos(rawPayload: unknown): MeloloRawVideo[] {
  if (!rawPayload || typeof rawPayload !== "object") {
    return [];
  }

  const detail = rawPayload as MeloloDetailPayload;
  const videos = Array.isArray(detail.videos) ? detail.videos : [];

  return videos.filter(
    (item): item is MeloloRawVideo => !!item && typeof item === "object",
  );
}

function extractVideoUrl(video: MeloloRawVideo): string {
  return firstNonEmptyString(
    video.video_url,
    video.play_url,
    video.stream_url,
    video.url,
  );
}

function formatDuration(seconds: number): string | undefined {
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;

  const totalSeconds = Math.floor(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function adaptMeloloEpisodeList(
  rawPayload: unknown,
  options?: {
    dramaId?: number;
    meloloDramaId?: string;
  },
): Episode[] {
  const dramaId = options?.dramaId ?? 0;
  const meloloDramaId = options?.meloloDramaId ?? "";

  return extractVideos(rawPayload).map((video, index) => {
    const episodeNumber = asNumber(video.episode, index + 1);
    const vid = firstNonEmptyString(video.vid, `episode-${episodeNumber}`);
    const durationSeconds = asNumber(video.duration, 0);
    const videoUrl = extractVideoUrl(video);

    return {
      id: createStableNumericId(
        `${meloloDramaId}:${vid}`,
        episodeNumber || index + 1,
      ),
      dramaId,
      title: `Episode ${episodeNumber}`,
      episodeNumber,
      duration: formatDuration(durationSeconds),
      videoUrl,
      isLocked: asBoolean(video.locked ?? video.is_locked, false),
      isVipOnly: asBoolean(video.vip ?? video.is_vip, false),

      // metadata source-specific
      meloloEpisodeId: vid,
      meloloVid: vid,
    } as Episode;
  });
}