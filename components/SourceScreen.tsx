import type { Drama } from "@/types/drama";
import type { Source } from "@/types/source";

type SourceScreenProps = {
  selectedSource: Source;
  searchQuery: string;
  sourceTab: "Beranda" | "Terbaru" | "Dubbing" | "Acak";
  filteredDramas: Drama[];
  favoriteIds: number[];
  isTelegramReady: boolean;
  onBack: () => void;
  onSearchChange: (value: string) => void;
  onTabChange: (tab: "Beranda" | "Terbaru" | "Dubbing" | "Acak") => void;
  onSelectDrama: (drama: Drama) => void;
  onToggleFavorite: (dramaId: number) => void;
};

const sourceTabs = [
  { label: "🏠 Beranda", value: "Beranda" },
  { label: "🆕 Terbaru", value: "Terbaru" },
  { label: "🎙️ Dubbing", value: "Dubbing" },
  { label: "🎲 Acak", value: "Acak" },
] as const;

export default function SourceScreen({
  selectedSource,
  searchQuery,
  sourceTab,
  filteredDramas,
  favoriteIds,
  isTelegramReady,
  onBack,
  onSearchChange,
  onTabChange,
  onSelectDrama,
  onToggleFavorite,
}: SourceScreenProps) {
  return (
    <main className="min-h-[100dvh] bg-[#06070B] text-white">
      <div className="mx-auto w-full max-w-[430px] min-h-[100dvh] pb-24">
        <header className="rounded-b-[24px] border-b border-white/10 bg-[#0C0F18] px-4 pb-3 pt-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
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

          <div className="rounded-[22px] border border-white/10 bg-[#12131A] px-4 py-2.5 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
            <div className="flex items-center gap-2.5">
              <span className="text-[18px] leading-none text-[#8F887C]">⌕</span>
              <input
                type="text"
                placeholder="Cari drama..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full bg-transparent text-[14px] text-[#F5F1E8] outline-none placeholder:text-[#8F887C]"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 items-center border-b border-[#181B25] pb-0 text-center">
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

        <section className="px-4 pt-4">
          <div className="grid grid-cols-3 items-start gap-x-3 gap-y-5">
            {filteredDramas.map((drama) => {
              const isFavorite = favoriteIds.includes(drama.id);

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
                  <div className="flex h-full flex-col overflow-hidden rounded-[22px] border border-[#B76E79]/35 bg-[#12131A] shadow-[0_16px_32px_rgba(0,0,0,0.22)]">
                    <div className="relative">
                      <div
                        className={`aspect-[0.72] w-full bg-gradient-to-b ${drama.posterClass}`}
                      />
                      <div className="absolute inset-0 bg-black/28" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#090B12]/90 via-transparent to-transparent" />

                      <div className="absolute left-2 top-2 flex items-center gap-1">
                        <span className="rounded-full bg-[linear-gradient(135deg,#B76E79,#C98B57)] px-2 py-1 text-[9px] font-bold leading-none text-white">
                          {drama.badge}
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
                        }`}
                      >
                        <span className="text-[14px] leading-none">
                          {isFavorite ? "♥" : "♡"}
                        </span>
                      </button>

                      <div className="absolute bottom-2 right-2 rounded-full border border-white/8 bg-[#11131B]/90 px-2 py-1 text-[10px] font-bold text-[#F5F1E8]">
                        {drama.episodes} Eps
                      </div>
                    </div>

                    <div className="flex min-h-[84px] flex-col border-t border-white/6 px-3 pb-2 pt-2">
                      <p className="line-clamp-2 min-h-[32px] text-[12px] font-semibold leading-[1.25] text-[#F5F1E8]">
                        {drama.title}
                      </p>

                      {drama.description ? (
                        <p className="mt-1 line-clamp-1 min-h-[14px] pr-1 text-[9px] leading-[14px] tracking-[0.01em] text-[#8F887C]">
                          {drama.description}
                        </p>
                      ) : (
                        <div className="mt-1 min-h-[14px]" />
                      )}

                      <div className="mt-1 flex flex-wrap gap-1">
                        {drama.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="w-fit rounded-[9px] border border-[#C9A45C]/18 bg-[#1A1C24] px-2 py-[3px] text-[8px] font-medium leading-none text-[#DCC38A]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
