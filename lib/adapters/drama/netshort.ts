import type { Drama } from "@/types/drama";
import { createBaseDrama } from "./base";

type NetShortDramaResponse = {
  drama_id: string | number;
  title?: string;
  total_episode?: number;
  intro?: string;
  cover_url?: string;
  tags?: string[];
  trending?: boolean;
};

export function adaptNetShortDrama(raw: NetShortDramaResponse): Drama {
  return createBaseDrama({
    id: Number(raw.drama_id) || 0,
    source: "NetShort",
    sourceId: "netshort",
    sourceName: "NetShort",
    title: raw.title ?? "",
    episodes: raw.total_episode ?? 0,
    description: raw.intro ?? "",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    isTrending: Boolean(raw.trending),
    posterClass: "",
    badge: raw.trending ? "Trending" : "",
  });
}