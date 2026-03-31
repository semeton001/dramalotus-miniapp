import type { Drama } from "@/types/drama";

export function createBaseDrama(partial: Partial<Drama>): Drama {
  return {
    id: partial.id ?? 0,
    source: partial.source ?? "",
    sourceId: partial.sourceId ?? "",
    sourceName: partial.sourceName ?? "",
    title: partial.title ?? "",
    episodes: partial.episodes ?? 0,
    badge: partial.badge ?? "",
    tags: partial.tags ?? [],
    posterClass: partial.posterClass ?? "",
    slug: partial.slug ?? "",
    description: partial.description ?? "",
    category: partial.category ?? "",
    isNew: partial.isNew ?? false,
    isDubbed: partial.isDubbed ?? false,
    isTrending: partial.isTrending ?? false,
    sortOrder: partial.sortOrder ?? 9999,
  };
}