"use client";

import type { Drama } from "@/types/drama";

type FavoritesBottomSheetProps = {
  isOpen: boolean;
  favoriteDramas: Drama[];
  onClose: () => void;
  onSelectDrama: (drama: Drama) => void;
  onToggleFavorite: (dramaId: number) => void;
};

export default function FavoritesBottomSheet({
  isOpen,
  favoriteDramas,
  onClose,
  onSelectDrama,
  onToggleFavorite,
}: FavoritesBottomSheetProps) {
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
          isOpen ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
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
            <h2 className="text-lg font-semibold text-white">Favorit Saya</h2>
            <p className="mt-1 text-sm text-[#8F887C]">
              {favoriteDramas.length} drama
            </p>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-y-auto px-4 py-4">
          {favoriteDramas.length === 0 ? (
            <div className="flex min-h-[240px] items-center justify-center text-center text-[#8F887C]">
              <div>
                <p className="text-base font-medium text-[#DDD4C4]">
                  Belum ada favorit.
                </p>
                <p className="mt-2 text-sm">
                  Simpan drama favoritmu untuk akses cepat.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-4 md:grid-cols-6 lg:grid-cols-8">
              {favoriteDramas.map((drama, index) => (
                <div
                  key={drama.id}
                  className="transition-all duration-300 ease-out"
                  style={{
                    transitionDelay: isOpen
                      ? `${Math.min(index * 30, 180)}ms`
                      : "0ms",
                    transform: isOpen ? "translateY(0px)" : "translateY(8px)",
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <div className="group relative">
                    <button
                      type="button"
                      onClick={() => onSelectDrama(drama)}
                      className="block w-full text-left"
                    >
                      <div className="overflow-hidden rounded-[18px] border border-white/8 bg-[#171922]">
                        <div className="aspect-[0.72] w-full overflow-hidden bg-white/5">
                          {drama.posterImage ? (
                            <img
                              src={drama.posterImage}
                              alt={drama.title}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
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
                      </div>

                      <div className="mt-2">
                        <p className="line-clamp-2 text-xs font-semibold leading-5 text-white">
                          {drama.title}
                        </p>
                        <p className="mt-1 text-[11px] text-[#8F887C]">
                          {drama.sourceName || "Drama"}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleFavorite(drama.id)}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-[#11131B]/92 text-white shadow-[0_4px_10px_rgba(0,0,0,0.18)] backdrop-blur-sm transition hover:bg-[#1A1D27]"
                      aria-label="Hapus dari favorit"
                    >
                      <span className="text-sm leading-none">✕</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}