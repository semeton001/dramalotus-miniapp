import type { Episode } from "@/types/episode";

export type DramaBoxEpisodeResponse = {
  chapterId: string;
  chapterIndex: number;
  isCharge: boolean;
  videoUrl?: string;
  "1080p"?: string;
};

export function adaptDramaBoxEpisode(
  raw: DramaBoxEpisodeResponse,
  dramaId: number,
): Episode {
  return {
    id: Number(raw.chapterId) || 0,
    dramaId,
    episodeNumber: raw.chapterIndex ?? 0,
    title: `Episode ${raw.chapterIndex ?? 0}`,
    duration: "",
    slug: raw.chapterId ?? "",
    description: undefined,
    videoUrl: raw["1080p"] ?? raw.videoUrl,
    thumbnail: undefined,
    isLocked: Boolean(raw.isCharge),
    isVipOnly: Boolean(raw.isCharge),
    sortOrder: raw.chapterIndex ?? 0,
  };
}

export function adaptDramaBoxEpisodeList(
  rawItems: DramaBoxEpisodeResponse[],
  dramaId: number,
): Episode[] {
  return rawItems.map((item) => adaptDramaBoxEpisode(item, dramaId));
}