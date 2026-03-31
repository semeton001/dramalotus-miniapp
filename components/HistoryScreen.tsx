import type { Drama } from "@/types/drama";
import type { Episode } from "@/types/episode";

type HistoryItem = {
  dramaId: number;
  episodeId: number;
};

type HistoryScreenProps = {
  dramas: Drama[];
  episodes: Episode[];
  historyItems: HistoryItem[];
  onBack: () => void;
  onOpenFavorites: () => void;
  onOpenProfile: () => void;
  onSelectDrama: (drama: Drama, episode: Episode | null) => void;
};

export default function HistoryScreen({
  dramas,
  episodes,
  historyItems,
  onBack,
  onOpenFavorites,
  onOpenProfile,
  onSelectDrama,
}: HistoryScreenProps) {
  const resolvedHistory = historyItems
    .map((item) => {
      const drama = dramas.find((d) => d.id === item.dramaId);
      const episode = episodes.find((e) => e.id === item.episodeId);

      if (!drama || !episode) return null;

      return { drama, episode };
    })
    .filter(Boolean) as { drama: Drama; episode: Episode }[];

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,rgba(201,164,92,0.10),transparent_24%),#0B0B0F] text-white">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[430px] px-4 pb-28 pt-6">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-white">
              Riwayat
            </h1>
            <p className="mt-1 text-sm leading-6 text-[#8F887C]">
              Lanjutkan tontonan terakhir Anda dengan lebih cepat dan nyaman.
            </p>
          </div>

          <button
            onClick={onBack}
            className="rounded-[18px] border border-white/10 bg-[#14151C] px-4 py-2.5 text-sm font-medium text-[#E6D3A3] shadow-[0_6px_18px_rgba(0,0,0,0.22)] transition hover:border-[#C9A45C]/20 hover:bg-[#181A22]"
          >
            Kembali
          </button>
        </header>

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#14161D_0%,#101118_100%)] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.30)] sm:p-5">
          <div className="mb-5 flex items-center justify-between rounded-[24px] border border-white/8 bg-[#14151D] px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.20)]">
            <div>
              <p className="text-[13px] uppercase tracking-[0.18em] text-[#8F887C]">
                Total Riwayat
              </p>
              <p className="mt-2 text-[28px] font-bold text-white">
                {resolvedHistory.length}
              </p>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(201,164,92,0.18),rgba(183,110,121,0.12))] text-[24px] shadow-[0_10px_24px_rgba(201,164,92,0.10)]">
              ↺
            </div>
          </div>

          <div className="space-y-3">
            {resolvedHistory.length === 0 ? (
              <div className="rounded-[26px] border border-white/8 bg-[#14151D] p-6 text-center shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
                <p className="text-lg font-semibold text-white">
                  Belum ada riwayat
                </p>
                <p className="mt-2 text-sm leading-6 text-[#8F887C]">
                  Drama yang Anda buka akan muncul di sini untuk memudahkan
                  lanjut nonton.
                </p>
              </div>
            ) : (
              resolvedHistory.map(({ drama, episode }) => (
                <button
                  key={`${drama.id}-${episode.id}`}
                  onClick={() => onSelectDrama(drama, episode)}
                  className="w-full rounded-[26px] border border-white/8 bg-[#171922] p-3 text-left shadow-[0_18px_40px_rgba(0,0,0,0.24)] transition hover:border-[#C9A45C]/20 hover:-translate-y-[1px]"
                >
                  <div className="flex gap-3">
                    <div
                      className={`h-[108px] w-[76px] shrink-0 rounded-[20px] border border-white/8 bg-gradient-to-b ${drama.posterClass}`}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-[16px] font-semibold leading-6 text-white">
                            {drama.title}
                          </p>
                          <p className="mt-1 text-[12px] font-medium text-[#C9A45C]">
                            {drama.sourceName}
                          </p>
                        </div>

                        <span className="rounded-full border border-[#C9A45C]/18 bg-[#11131B]/85 px-2.5 py-1 text-[10px] font-semibold text-[#F2E6C9]">
                          Resume
                        </span>
                      </div>

                      <div className="mt-3 rounded-[18px] border border-white/6 bg-[#13151C] px-3 py-2.5">
                        <p className="text-[13px] font-medium text-[#E8DED0]">
                          {episode.title}
                        </p>
                        <p className="mt-1 text-[11px] text-[#8F887C]">
                          Durasi {episode.duration}
                        </p>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <nav className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-1/2 w-[calc(100%-24px)] max-w-[430px] -translate-x-1/2 rounded-[28px] border border-white/10 bg-[#12131A]/95 p-3 backdrop-blur">
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <button
              onClick={onBack}
              className="rounded-2xl px-3 py-2 text-[#B8AA8A] transition hover:bg-[#C9A45C]/10 hover:text-[#E6D3A3]"
            >
              Beranda
            </button>
            <button className="rounded-2xl bg-[linear-gradient(135deg,rgba(201,164,92,0.22),rgba(185,138,132,0.12))] px-3 py-2 font-medium text-[#F2E6C9] shadow-[0_6px_18px_rgba(201,164,92,0.12)]">
              Riwayat
            </button>
            <button
              onClick={onOpenFavorites}
              className="rounded-2xl px-3 py-2 text-[#B8AA8A] transition hover:bg-[#C9A45C]/10 hover:text-[#E6D3A3]"
            >
              Favorit
            </button>
            <button
              onClick={onOpenProfile}
              className="rounded-2xl px-3 py-2 text-[#B8AA8A] transition hover:bg-[#C9A45C]/10 hover:text-[#E6D3A3]"
            >
              Profil
            </button>
          </div>
        </nav>
      </div>
    </main>
  );
}
