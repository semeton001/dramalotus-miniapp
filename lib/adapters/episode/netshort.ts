import type { Episode } from "@/types/episode";

function pickString(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
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

function extractEpisodeItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  const raw =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;

  if (!raw) return [];

  const candidates: unknown[] = [
    raw.items,
    raw.data,
    raw.results,
    raw.list,
    raw.records,
    raw.episodes,
    raw.episodeList,
    raw.shortPlayEpisodes,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  if (
    raw.data &&
    typeof raw.data === "object" &&
    Array.isArray((raw.data as Record<string, unknown>).items)
  ) {
    return (raw.data as Record<string, unknown>).items as unknown[];
  }

  return [];
}

function toNumericEpisodeId(
  numericDramaId: number,
  episodeNumber: number,
  index: number,
): number {
  const suffix = String(episodeNumber || index + 1).padStart(3, "0");
  return Number(`${numericDramaId}${suffix}`);
}

function resolveSubtitleUrl(raw: Record<string, unknown>): string {
  const direct = pickString(
    raw,
    "subtitle",
    "subtitleUrl",
    "subtitle_url",
    "captionUrl",
    "caption_url",
    "vtt",
    "subtitlesUrl",
    "subtitles_url",
    "subtitleVtt",
    "subtitle_vtt",
  );
  if (direct) return direct;

  const subtitleListCandidates = [
    raw.subtitle_list,
    raw.subtitleList,
    raw.subtitles,
    raw.captionList,
    raw.captions,
  ];

  for (const candidate of subtitleListCandidates) {
    if (!Array.isArray(candidate)) continue;

    const indo = candidate.find((item) => {
      if (!item || typeof item !== "object") return false;
      const entry = item as Record<string, unknown>;

      const displayName =
        typeof entry.display_name === "string" ? entry.display_name.trim() : "";
      const label = typeof entry.label === "string" ? entry.label.trim() : "";
      const language =
        typeof entry.language === "string" ? entry.language.trim() : "";
      const lang = typeof entry.lang === "string" ? entry.lang.trim() : "";

      return (
        displayName === "Indonesian" ||
        label === "Indonesian" ||
        language === "id-ID" ||
        language === "id_ID" ||
        lang === "id-ID" ||
        lang === "id_ID" ||
        language.toLowerCase() === "indonesian" ||
        lang.toLowerCase() === "indonesian"
      );
    });

    const picked =
      (indo && typeof indo === "object"
        ? pickString(
            indo as Record<string, unknown>,
            "subtitle",
            "url",
            "src",
            "file",
          )
        : "") || "";

    if (picked) return picked;

    const first = candidate[0];
    if (first && typeof first === "object") {
      const fallback = pickString(
        first as Record<string, unknown>,
        "subtitle",
        "url",
        "src",
        "file",
      );
      if (fallback) return fallback;
    }
  }

  return "";
}

export function normalizeNetshortEpisodes(
  payload: unknown,
  numericDramaId: number,
): Episode[] {
  const items = extractEpisodeItems(payload);

  return items.map((item, index) => {
    const raw =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};

    const episodeNumber =
      pickNumber(
        raw,
        "episodeNum",
        "episode_num",
        "episode",
        "episodeNumber",
        "chapter",
        "chapterIndex",
        "sort",
      ) || index + 1;

    const videoUrl = pickString(
      raw,
      "videoUrl",
      "video_url",
      "playUrl",
      "play_url",
      "url",
      "m3u8",
      "video",
      "playAddress",
    );

    const subtitleUrl = resolveSubtitleUrl(raw);

    return {
      id: toNumericEpisodeId(numericDramaId, episodeNumber, index),
      dramaId: numericDramaId,
      episodeNumber,
      title:
        pickString(
          raw,
          "title",
          "episodeTitle",
          "episode_title",
          "chapterName",
          "name",
        ) || `Episode ${episodeNumber}`,
      duration:
        pickString(raw, "duration", "duration_text", "durationText") || "--:--",
      slug: pickString(raw, "slug", "episodeSlug", "episode_slug") || undefined,
      description:
        pickString(
          raw,
          "description",
          "summary",
          "intro",
          "episodeDescription",
          "episode_description",
        ) || undefined,
      videoUrl: videoUrl || undefined,
      thumbnail:
        pickString(raw, "cover", "thumbnail", "image", "poster") || undefined,
      isLocked: Boolean(
        raw.isLocked === true ||
        raw.locked === true ||
        pickNumber(raw, "isLocked", "locked", "needVip") === 1,
      ),
      isVipOnly: Boolean(
        raw.isVipOnly === true ||
        raw.vipOnly === true ||
        pickNumber(raw, "isVipOnly", "vipOnly", "needVip") === 1,
      ),
      sortOrder: index,
      subtitleUrl: subtitleUrl || undefined,
      subtitleLang: subtitleUrl ? "id-ID" : undefined,
      subtitleLabel: subtitleUrl ? "Indonesian" : undefined,
      netshortEpisodeId:
        pickString(
          raw,
          "episodeId",
          "episode_id",
          "shortPlayEpisodeId",
          "short_play_episode_id",
          "id",
        ) || undefined,
      netshortVid:
        pickString(raw, "vid", "videoId", "video_id", "playVid") || undefined,
    };
  });
}
