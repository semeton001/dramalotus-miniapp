"use client";

import type { Drama } from "@/types/drama";

type FavoritesScreenProps = {
  favoriteDramas: Drama[];
  onBack: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onSelectDrama: (drama: Drama) => void;
  onClearFavorites: () => void;
};

export default function FavoritesScreen({
  favoriteDramas,
  onBack,
  onOpenHistory,
  onOpenProfile,
  onSelectDrama,
  onClearFavorites,
}: FavoritesScreenProps) {
  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,rgba(201,164,92,0.10),transparent_24%),#0B0B0F] text-white">
      <div className="mx-auto min-h-[100dvh] w-full max-w-[430px] px-4 pb-28 pt-6">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-white">
              Favorit Saya
            </h1>
            <p className="mt-1 text-sm leading-6 text-[#8F887C]">
              Kumpulan drama yang Anda simpan untuk ditonton lagi kapan saja.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClearFavorites}
              className="rounded-[18px] border border-[#EF476F]/20 bg-[#2A1419] px-4 py-2.5 text-sm font-medium text-[#FFB3C1] shadow-[0_6px_18px_rgba(0,0,0,0.22)] transition hover:border-[#EF476F]/30 hover:bg-[#34181F]"
            >
              Hapus Semua
            </button>
            <button
              onClick={onBack}
              className="rounded-[18px] border border-white/10 bg-[#14151C] px-4 py-2.5 text-sm font-medium text-[#E6D3A3] shadow-[0_6px_18px_rgba(0,0,0,0.22)] transition hover:border-[#C9A45C]/20 hover:bg-[#181A22]"
            >
              Kembali
            </button>
          </div>
        </header>

        <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#14161D_0%,#101118_100%)] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.30)] sm:p-5">
          <div className="mb-5 flex items-center justify-between rounded-[24px] border border-white/8 bg-[#14151D] px-4 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.20)]">
            <div>
              <p className="text-[13px] uppercase tracking-[0.18em] text-[#8F887C]">
                Total Favorit
              </p>
              <p className="mt-2 text-[28px] font-bold text-white">
                {favoriteDramas.length}
              </p>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(201,164,92,0.20),rgba(183,110,121,0.14))] text-[24px] shadow-[0_10px_24px_rgba(201,164,92,0.12)]">
              ♥
            </div>
          </div>

          {favoriteDramas.length === 0 ? (
            <div className="rounded-[26px] border border-white/8 bg-[#14151D] p-6 text-center shadow-[0_12px_30px_rgba(0,0,0,0.22)]">
              <p className="text-lg font-semibold text-white">
                Belum ada favorit
              </p>
              <p className="mt-2 text-sm leading-6 text-[#8F887C]">
                Tambahkan drama ke favorit agar koleksinya muncul di sini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {favoriteDramas.map((drama) => (
                <button
                  key={drama.id}
                  onClick={() => onSelectDrama(drama)}
                  className="overflow-hidden rounded-[24px] border border-white/8 bg-[#171922] text-left shadow-[0_18px_40px_rgba(0,0,0,0.26)] transition hover:border-[#C9A45C]/20 hover:-translate-y-[1px]"
                >
                  <div className="relative">
                    {(typeof drama.posterImage === "string" &&
                      drama.posterImage.trim().length > 0) ||
                    (typeof drama.coverImage === "string" &&
                      drama.coverImage.trim().length > 0) ? (
                      <img
                        src={
                          typeof drama.posterImage === "string" &&
                          drama.posterImage.trim().length > 0
                            ? drama.posterImage
                            : drama.coverImage
                        }
                        alt={drama.title}
                        className="aspect-[3/4] w-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        className={`aspect-[3/4] w-full bg-gradient-to-br ${drama.posterClass}`}
                      />
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#090B12]/75 via-transparent to-transparent" />
                    <div className="absolute right-3 top-3 rounded-full border border-[#C9A45C]/20 bg-[#11131B]/85 px-2.5 py-1 text-[10px] font-semibold text-[#F2E6C9] backdrop-blur">
                      Favorit
                    </div>
                  </div>

                  <div className="border-t border-white/6 px-3 pb-3 pt-3">
                    <p className="line-clamp-2 min-h-[38px] text-[13px] font-semibold leading-[1.35] text-white">
                      {drama.title}
                    </p>
                    <p className="mt-1 text-[11px] leading-5 text-[#8F887C]">
                      {drama.episodes} episode
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <nav className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-1/2 w-[calc(100%-24px)] max-w-[430px] -translate-x-1/2 rounded-[28px] border border-white/10 bg-[#12131A]/95 p-3 backdrop-blur">
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <button
              onClick={onBack}
              className="rounded-2xl px-3 py-2 text-[#B8AA8A] transition hover:bg-[#C9A45C]/10 hover:text-[#E6D3A3]"
            >
              Beranda
            </button>
            <button
              onClick={onOpenHistory}
              className="rounded-2xl px-3 py-2 text-[#B8AA8A] transition hover:bg-[#C9A45C]/10 hover:text-[#E6D3A3]"
            >
              Riwayat
            </button>
            <button className="rounded-2xl bg-[linear-gradient(135deg,rgba(201,164,92,0.22),rgba(185,138,132,0.12))] px-3 py-2 font-medium text-[#F2E6C9] shadow-[0_6px_18px_rgba(201,164,92,0.12)]">
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
