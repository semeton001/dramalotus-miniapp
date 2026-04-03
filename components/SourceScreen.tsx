"use client";

import type { Drama } from "@/types/drama";
import type { Source } from "@/types/source";

type SourceTab =
  | "Beranda"
  | "Terbaru"
  | "Dubbing"
  | "Acak"
  | "For You"
  | "Trending"
  | "Romance"
  | "ForYou"
  | "Anime";

type SourceScreenProps = {
  selectedSource: Source;
  searchQuery: string;
  sourceTab: SourceTab;
  filteredDramas: Drama[];
  favoriteIds: number[];
  isTelegramReady: boolean;
  isSearchEnabled?: boolean;
  meloloOffset?: number;
  showMeloloPagination?: boolean;
  onMeloloPrevPage?: () => void;
  onMeloloNextPage?: () => void;
  onBack: () => void;
  onSearchChange: (value: string) => void;
  onSubmitSearch: () => void;
  onTabChange: (tab: SourceTab) => void;
  onSelectDrama: (drama: Drama) => void;
  onToggleFavorite: (dramaId: number) => void;
};

const dramaBoxTabs: Array<{ label: string; value: SourceTab }> = [
  { label: "🏠 Beranda", value: "Beranda" },
  { label: "🆕 Terbaru", value: "Terbaru" },
  { label: "🎙️ Dubbing", value: "Dubbing" },
  { label: "🎲 Acak", value: "Acak" },
];

const reelShortTabs: Array<{ label: string; value: SourceTab }> = [
  { label: "🏠 Beranda", value: "Beranda" },
  { label: "✨ For You", value: "For You" },
  { label: "🔥 Trending", value: "Trending" },
  { label: "💞 Romance", value: "Romance" },
];

const meloloTabs: Array<{ label: string; value: SourceTab }> = [
  { label: "🏠 Beranda", value: "Beranda" },
  { label: "🆕 Terbaru", value: "Terbaru" },
  { label: "✨ ForYou", value: "ForYou" },
  { label: "🔥 Trending", value: "Trending" },
];

const dramawaveTabs: Array<{ label: string; value: SourceTab }> = [
  { label: "🏠 Beranda", value: "Beranda" },
  { label: "✨ ForYou", value: "ForYou" },
  { label: "🎌 Anime", value: "Anime" },
  { label: "🎲 Acak", value: "Acak" },
];

function isDramaBoxSource(source: Source): boolean {
  return source.id === "1" || source.slug === "dramabox";
}

function isReelShortSource(source: Source): boolean {
  return (
    source.slug?.toLowerCase() === "reelshort" ||
    source.name?.toLowerCase() === "reelshort"
  );
}

function isMeloloSource(source: Source): boolean {
  return (
    source.slug?.toLowerCase() === "melolo" ||
    source.name?.toLowerCase() === "melolo"
  );
}

function isDramawaveSource(source: Source): boolean {
  return (
    source.slug?.toLowerCase() === "dramawave" ||
    source.name?.toLowerCase() === "dramawave"
  );
}

function getSourceTabs(selectedSource: Source) {
  if (isReelShortSource(selectedSource)) {
    return reelShortTabs;
  }

  if (isMeloloSource(selectedSource)) {
    return meloloTabs;
  }

  if (isDramawaveSource(selectedSource)) {
    return dramawaveTabs;
  }

  return dramaBoxTabs;
}

function resolveBadge(
  drama: Drama,
  sourceTab: SourceTab,
  selectedSource: Source,
) {
  if (sourceTab === "Acak") return "Acak";
  if (sourceTab === "Terbaru") return "Baru";
  if (sourceTab === "Dubbing") return "Dub";
  if (sourceTab === "For You") return "For You";
  if (sourceTab === "ForYou") return "ForYou";
  if (sourceTab === "Trending") return "Trending";
  if (sourceTab === "Romance") return "Romance";
  if (sourceTab === "Anime") return "Anime";

  if (typeof drama.badge === "string" && drama.badge.trim().length > 0) {
    return drama.badge.trim();
  }

  if (isDramaBoxSource(selectedSource)) {
    return "DramaBox";
  }

  if (isReelShortSource(selectedSource)) {
    return "ReelShort";
  }

  if (isMeloloSource(selectedSource)) {
    return "Melolo";
  }

  if (isDramawaveSource(selectedSource)) {
    return "Dramawave";
  }

  return "Drama";
}

function resolveBadgeClass(sourceTab: SourceTab, selectedSource: Source) {
  if (sourceTab === "Acak") {
    return "bg-[linear-gradient(135deg,#F97316,#FACC15)] text-white";
  }

  if (sourceTab === "Terbaru") {
    return "bg-[linear-gradient(135deg,#8B5CF6,#EC4899)] text-white";
  }

  if (sourceTab === "Dubbing") {
    return "bg-[linear-gradient(135deg,#0EA5E9,#14B8A6)] text-white";
  }

  if (sourceTab === "For You" || sourceTab === "ForYou") {
    return "bg-[linear-gradient(135deg,#8B5CF6,#6366F1)] text-white";
  }

  if (sourceTab === "Trending") {
    return "bg-[linear-gradient(135deg,#EF4444,#F59E0B)] text-white";
  }

  if (sourceTab === "Romance") {
    return "bg-[linear-gradient(135deg,#EC4899,#F472B6)] text-white";
  }

  if (sourceTab === "Anime") {
    return "bg-[linear-gradient(135deg,#06B6D4,#3B82F6)] text-white";
  }

  if (isMeloloSource(selectedSource)) {
    return "bg-[linear-gradient(135deg,#C13C7A,#F472B6)] text-white";
  }

  if (isReelShortSource(selectedSource)) {
    return "bg-[linear-gradient(135deg,#6366F1,#8B5CF6)] text-white";
  }

  if (isDramawaveSource(selectedSource)) {
    return "bg-[linear-gradient(135deg,#7C3AED,#EC4899)] text-white";
  }

  return "bg-[linear-gradient(135deg,#B76E79,#C98B57)] text-white";
}

export default function SourceScreen({
  selectedSource,
  searchQuery,
  sourceTab,
  filteredDramas,
  favoriteIds,
  isTelegramReady,
  isSearchEnabled = true,
  meloloOffset = 0,
  showMeloloPagination = false,
  onMeloloPrevPage,
  onMeloloNextPage,
  onBack,
  onSearchChange,
  onSubmitSearch,
  onTabChange,
  onSelectDrama,
  onToggleFavorite,
}: SourceScreenProps) {
  const sourceTabs = getSourceTabs(selectedSource);

  return (
    <main className="min-h-[100dvh] w-full bg-[#06070B] text-white">
      <div className="min-h-[100dvh] w-full pb-28">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0C0F18]/95 px-3 pb-3 pt-3 backdrop-blur md:px-4 lg:px-6">
          <div className="relative mb-4 flex items-center justify-between gap-2">
            <button
              onClick={onBack}
              className="relative z-10 rounded-[18px] bg-gradient-to-r from-[#EF476F] to-[#9C6B74] px-4 py-2.5 text-[14px] font-semibold text-white shadow-[0_8px_24px_rgba(239,71,111,0.25)]"
            >
              ✕ Tutup
            </button>

            <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center px-[96px]">
              <div className="flex min-w-0 items-center justify-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl">
                  <img
                    src={selectedSource.logo ?? "/dramalotus-logo.png"}
                    alt={selectedSource.name}
                    className="h-full w-full object-contain"
                  />
                </div>

                <h1 className="truncate text-center text-[19px] font-semibold tracking-tight text-white">
                  {selectedSource.name}
                </h1>
              </div>
            </div>

            <div className="relative z-10 flex items-center gap-2">
              <button
                type="button"
                className="rounded-[16px] border border-[#C9A45C]/20 bg-[#14151C] px-3 py-2.5 text-sm text-[#E6D3A3] shadow-sm"
              >
                ID
              </button>
              <button
                type="button"
                className="rounded-[16px] bg-[#1C1F29] px-3 py-2.5 text-sm text-[#F5F1E8]"
              >
                ˅
              </button>
              <button
                type="button"
                className="rounded-[16px] bg-[#1C1F29] px-3 py-2.5 text-sm text-[#F5F1E8]"
              >
                •••
              </button>
            </div>
          </div>

          {isSearchEnabled && (
            <div className="rounded-[22px] border border-white/10 bg-[#12131A] px-4 py-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
              <div className="flex items-center gap-2.5">
                <span className="text-[18px] leading-none text-[#8F887C]">
                  ⌕
                </span>
                <input
                  type="text"
                  placeholder="Cari drama..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onSubmitSearch();
                    }
                  }}
                  className="w-full bg-transparent text-[14px] text-[#F5F1E8] outline-none placeholder:text-[#8F887C]"
                />
                <button
                  type="button"
                  onClick={onSubmitSearch}
                  className="shrink-0 rounded-[14px] border border-[#C9A45C]/20 bg-[#1A1C24] px-3 py-2 text-[12px] font-medium text-[#E6D3A3] transition hover:bg-[#20232D]"
                >
                  Cari
                </button>
              </div>
            </div>
          )}

          <div
            className={`grid grid-cols-4 items-center border-b border-[#181B25] pb-0 text-center ${isSearchEnabled ? "mt-4" : "mt-2"}`}
          >
            {sourceTabs.map((tab) => {
              const active = sourceTab === tab.value;

              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => onTabChange(tab.value)}
                  className={`relative whitespace-nowrap pb-3 text-[12px] font-semibold transition ${
                    active ? "text-[#E6D3A3]" : "text-[#8F887C]"
                  }`}
                >
                  {tab.label}
                  {active && (
                    <span className="absolute bottom-0 left-1/2 h-[2px] w-[58px] -translate-x-1/2 rounded-full bg-[linear-gradient(90deg,#B76E79,#C9A45C,#E6D3A3)]" />
                  )}
                </button>
              );
            })}
          </div>
        </header>

        <section className="px-3 pt-4 md:px-4 lg:px-6">
          {filteredDramas.length === 0 ? (
            <div className="rounded-[24px] border border-white/10 bg-[#12131A] px-5 py-10 text-center shadow-[0_12px_30px_rgba(0,0,0,0.2)]">
              <p className="text-base font-semibold text-[#F5F1E8]">
                Belum ada drama
              </p>
              <p className="mt-2 text-sm text-[#8F887C]">
                Coba pindah tab atau ubah kata kunci pencarian.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                {filteredDramas.map((drama) => {
                  const isFavorite = favoriteIds.includes(drama.id);
                  const badgeLabel = resolveBadge(
                    drama,
                    sourceTab,
                    selectedSource,
                  );
                  const badgeClass = resolveBadgeClass(
                    sourceTab,
                    selectedSource,
                  );
                  const posterSrc =
                    typeof drama.posterImage === "string" &&
                    drama.posterImage.trim().length > 0
                      ? drama.posterImage
                      : typeof drama.coverImage === "string" &&
                          drama.coverImage.trim().length > 0
                        ? drama.coverImage
                        : "";
                  const hasPosterImage = posterSrc.length > 0;
                  const safeTags = Array.isArray(drama.tags) ? drama.tags : [];
                  const safeDescription =
                    typeof drama.description === "string"
                      ? drama.description
                      : "";
                  const safeEpisodes =
                    typeof drama.episodes === "number" ? drama.episodes : 0;

                  return (
                    <div
                      key={drama.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest("button")) return;
                        onSelectDrama(drama);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectDrama(drama);
                        }
                      }}
                      className="h-full text-left"
                    >
                      <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-[#B76E79]/35 bg-[#12131A] shadow-[0_16px_32px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_42px_rgba(0,0,0,0.28)]">
                        <div className="relative">
                          {hasPosterImage ? (
                            <img
                              src={posterSrc}
                              alt={drama.title}
                              className="aspect-[0.72] w-full object-cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div
                              className={`aspect-[0.72] w-full bg-gradient-to-b ${
                                drama.posterClass ||
                                "from-[#3A102A] via-[#12131A] to-[#090B12]"
                              }`}
                            />
                          )}

                          <div className="absolute inset-0 bg-black/18" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#090B12]/92 via-transparent to-transparent" />

                          <div className="absolute left-2 top-2 flex items-center gap-1">
                            <span
                              className={`rounded-full px-2 py-1 text-[9px] font-bold leading-none ${badgeClass}`}
                            >
                              {badgeLabel}
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={!isTelegramReady}
                            onPointerUp={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onToggleFavorite(drama.id);
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                            onTouchStart={(e) => {
                              e.stopPropagation();
                            }}
                            aria-label={
                              isFavorite
                                ? "Hapus dari favorit"
                                : "Tambah ke favorit"
                            }
                            className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border text-[12px] shadow-[0_3px_8px_rgba(0,0,0,0.18)] backdrop-blur-sm transition ${
                              isFavorite
                                ? "border-[#C9A45C]/35 bg-[linear-gradient(135deg,rgba(201,164,92,0.22),rgba(183,110,121,0.18))] text-[#F5E6C5]"
                                : "border-white/8 bg-[#11131B]/88 text-white/90"
                            } ${
                              !isTelegramReady
                                ? "cursor-not-allowed opacity-50"
                                : ""
                            }`}
                          >
                            <span className="text-[14px] leading-none">
                              {isFavorite ? "♥" : "♡"}
                            </span>
                          </button>

                          {safeEpisodes > 0 && (
                            <div className="absolute bottom-2 right-2 rounded-full border border-white/8 bg-[#11131B]/90 px-2 py-1 text-[10px] font-bold text-[#F5F1E8]">
                              {safeEpisodes} Eps
                            </div>
                          )}
                        </div>

                        <div className="flex min-h-[84px] flex-col border-t border-white/6 px-3 pb-2 pt-2">
                          <p className="line-clamp-2 min-h-[32px] text-[12px] font-semibold leading-[1.25] text-[#F5F1E8]">
                            {drama.title}
                          </p>

                          {safeDescription ? (
                            <p className="mt-1 line-clamp-2 text-[11px] leading-[1.35] text-[#A6A0B3]">
                              {safeDescription}
                            </p>
                          ) : safeTags.length > 0 ? (
                            <p className="mt-1 line-clamp-2 text-[11px] leading-[1.35] text-[#A6A0B3]">
                              {safeTags.slice(0, 3).join(" • ")}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {showMeloloPagination ? (
                <div className="mt-5 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={onMeloloPrevPage}
                    disabled={meloloOffset <= 0}
                    className="rounded-[16px] border border-white/10 bg-[#12131A] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Prev
                  </button>

                  <span className="text-sm text-[#8F887C]">
                    Page {meloloOffset + 1}
                  </span>

                  <button
                    type="button"
                    onClick={onMeloloNextPage}
                    className="rounded-[16px] border border-white/10 bg-[#12131A] px-4 py-2 text-sm text-white"
                  >
                    Next →
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}