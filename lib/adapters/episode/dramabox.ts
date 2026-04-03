import type { Episode } from "@/types/episode";

export type DramaBoxEpisodeResponse = {
  chapterId: string;
  chapterIndex?: number;
  isCharge?: boolean;
  videoUrl?: string;
  playUrl?: string;
  url?: string;
  videoPlayUrl?: string;
  video_url?: string;
  "1080p"?: string;
  "720p"?: string;
  "480p"?: string;
};

function getDramaBoxVideoUrl(raw: DramaBoxEpisodeResponse): string | undefined {
  const candidates = [
    raw["720p"],
    raw["480p"],
    raw.videoUrl,
    raw.playUrl,
    raw.url,
    raw.videoPlayUrl,
    raw.video_url,
    raw["1080p"],
  ];

  const resolved = candidates.find(
    (value) => typeof value === "string" && value.trim().length > 0,
  );

  return resolved?.trim();
}

export function adaptDramaBoxEpisode(
  raw: DramaBoxEpisodeResponse,
  dramaId: number,
): Episode {
  const episodeNumber = Number(raw.chapterIndex ?? 0);

  return {
    id: Number(raw.chapterId) || 0,
    dramaId,
    episodeNumber,
    title: `Episode ${episodeNumber || 0}`,
    duration: "",
    slug: raw.chapterId ?? "",
    description: undefined,
    videoUrl: getDramaBoxVideoUrl(raw),
    thumbnail: undefined,
    isLocked: Boolean(raw.isCharge),
    isVipOnly: Boolean(raw.isCharge),
    sortOrder: episodeNumber,
  };
}

export function adaptDramaBoxEpisodeList(
  rawItems: DramaBoxEpisodeResponse[],
  dramaId: number,
): Episode[] {
  return rawItems
    .map((item) => adaptDramaBoxEpisode(item, dramaId))
    .filter((item) => item.id > 0)
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
}
