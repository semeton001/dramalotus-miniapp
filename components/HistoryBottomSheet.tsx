"use client";

import type { Drama } from "@/types/drama";
import type { Episode } from "@/types/episode";

type HistoryItem = {
  dramaId: number;
  episodeId: number;
};

type HistoryBottomSheetProps = {
  isOpen: boolean;
  dramas: Drama[];
  episodes: Episode[];
  historyItems: HistoryItem[];
  onClose: () => void;
  onClearAll: () => void;
  onSelectHistory: (drama: Drama, episode: Episode | null) => void;
};

export default function HistoryBottomSheet({
  isOpen,
  dramas,
  episodes,
  historyItems,
  onClose,
  onClearAll,
  onSelectHistory,
}: HistoryBottomSheetProps) {
  const historyEntries = historyItems
    .map((item) => {
      const drama = dramas.find((d) => d.id === item.dramaId) ?? null;
      const episode = episodes.find((e) => e.id === item.episodeId) ?? null;

      if (!drama) return null;

      return {
        key: `${item.dramaId}-${item.episodeId}`,
        drama,
        episode,
      };
    })
    .filter(Boolean) as Array<{
    key: string;
    drama: Drama;
    episode: Episode | null;
  }>;

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-500 ease-out ${
        isOpen
          ? "pointer-events-auto bg-black/60"
          : "pointer-events-none bg-black/0"
      }`}
      onClick={onClose}
      aria-hidden={!isOpen}
    >
      <div
        className={`absolute inset-x-0 bottom-0 mx-auto w-full max-w-[1100px] rounded-t-[28px] border border-white/10 bg-[#0F1118] shadow-[0_-20px_50px_rgba(0,0,0,0.35)] transition-all duration-300 ease-out ${
          isOpen
            ? "translate-y-0 opacity-100"
            : "translate-y-6 opacity-0"
        }`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex justify-center pt-3">
          <div className="h-1.5 w-14 rounded-full bg-white/20" />
        </div>

        <div className="flex items-center justify-between border-b border-white/8 px-4 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Riwayat Menonton
            </h2>
            <p className="mt-1 text-sm text-[#8F887C]">
              {historyEntries.length} item
            </p>
          </div>

          <button
            onClick={onClearAll}
            className="text-sm font-medium text-red-400 transition hover:text-red-300"
          >
            Hapus Semua
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-4 py-4">
          {historyEntries.length === 0 ? (
            <div className="flex min-h-[240px] items-center justify-center text-center text-[#8F887C]">
              <div className="transition-all duration-300 ease-out">
                <p className="text-base font-medium text-[#DDD4C4]">
                  Belum ada riwayat menonton.
                </p>
                <p className="mt-2 text-sm">
                  Mulai nonton drama favoritmu!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {historyEntries.map(({ key, drama, episode }, index) => (
                <button
                  key={key}
                  onClick={() => onSelectHistory(drama, episode)}
                  className="flex w-full items-center gap-3 rounded-[18px] border border-white/8 bg-[#171922] p-3 text-left transition duration-200 hover:bg-[#1B1E28]"
                  style={{
                    transitionDelay: isOpen ? `${Math.min(index * 35, 180)}ms` : "0ms",
                    transform: isOpen ? "translateY(0px)" : "translateY(8px)",
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded-xl bg-white/5">
                    {drama.posterImage ? (
                      <img
                        src={drama.posterImage}
                        alt={drama.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className={`h-full w-full bg-gradient-to-b ${
                          drama.posterClass ||
                          "from-[#3A102A] via-[#12131A] to-[#090B12]"
                        }`}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {drama.title}
                    </p>
                    <p className="mt-1 text-xs text-[#8F887C]">
                      {episode?.title ?? "Episode terakhir"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}