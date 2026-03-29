import Image from "next/image";
import { Cinzel } from "next/font/google";
import type { Source } from "@/types/source";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

type HomeScreenProps = {
  popularSources: Source[];
  otherSources: Source[];
  onSelectSource: (source: Source) => void;
  onOpenHistory: () => void;
  onOpenFavorites: () => void;
  onOpenProfile: () => void;
};

export default function HomeScreen({
  popularSources,
  otherSources,
  onSelectSource,
  onOpenHistory,
  onOpenFavorites,
  onOpenProfile,
}: HomeScreenProps) {
  return (
    <main className="min-h-screen bg-[#050507] text-[#F5F1E8]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-6">
        <header className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#12131A] px-5 py-6 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,164,92,0.16),transparent_38%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(185,138,132,0.08),transparent_58%)]" />

          <div className="relative text-center">
            <div
              className={`${cinzel.className} mx-auto inline-flex items-center gap-2 rounded-full border border-[#C9A45C]/15 bg-[#171922] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#DCC38A]`}
            >
              <span className="h-2 w-2 rounded-full bg-[#C9A45C]" />
              DRAMALOTUS PREMIERE SELECTION
            </div>

            <div className="mx-auto mt-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-[30px] border border-[#C9A45C]/15 bg-[linear-gradient(135deg,rgba(201,164,92,0.08),rgba(185,138,132,0.04))] shadow-[0_0_60px_rgba(201,164,92,0.08)]">
              <Image
                src="/dramalotus-logo.png"
                alt="DRAMALOTUS Logo"
                width={112}
                height={112}
                className="h-full w-full object-cover"
              />
            </div>

            <h1 className="font-ExoBold mt-4 text-[38px] tracking-[0.02em] text-[#D9B36A]">
              DRAMALOTUS
            </h1>

            <p className="mx-auto mt-2 max-w-xs text-center text-[15px] leading-6 text-[#CFC5B5]">
              Drama pendek paling panas, penuh romansa
              <br />
              Siap menemani harimu.
            </p>

            <p className="mx-auto mt-3 max-w-sm text-center text-[13px] leading-6 text-[#8F887C]">
              Masuk ke koleksi drama pilihan, jelajahi source favoritmu, lalu
              lanjut nonton dengan ritme yang cepat dan nyaman.
            </p>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-3 text-center">
                <p className="text-sm font-semibold text-[#F2E6C9]">12</p>
                <p className="mt-1 text-[11px] text-[#8F887C]">source aktif</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-3 text-center">
                <p className="text-sm font-semibold text-[#F2E6C9]">5</p>
                <p className="mt-1 text-[11px] text-[#8F887C]">family API</p>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-3 text-center">
                <p className="text-sm font-semibold text-[#F2E6C9]">24/7</p>
                <p className="mt-1 text-[11px] text-[#8F887C]">
                  siap streaming
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-medium text-[#DDD4C4] transition hover:bg-white/[0.05]">
                Bagikan
              </button>
              <button className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-medium text-[#DDD4C4] transition hover:bg-white/[0.05]">
                Muat Ulang
              </button>
            </div>
          </div>
        </header>

        <section className="mt-8">
          <div className="mb-4 text-center">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.28em] text-[#8F887C]">
              Populer
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {popularSources.map((source) => (
              <button
                key={source.id}
                onClick={() => onSelectSource(source)}
                className="aspect-square rounded-[28px] border border-white/10 bg-[#12131A] px-3 py-3 text-center shadow-[0_18px_36px_rgba(0,0,0,0.22)] transition hover:border-[#C9A45C]/20"
              >
                <div className="flex h-full flex-col items-center justify-between">
                  <div className="relative flex flex-1 items-center justify-center">
                    {source.logo ? (
                      <Image
                        src={source.logo}
                        alt={source.name}
                        width={72}
                        height={72}
                        className="h-[72px] w-[72px] rounded-[20px] object-contain"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-[#E6D3A3]">
                        {source.name.charAt(0)}
                      </span>
                    )}

                    {source.badge && (
                      <span className="absolute -right-4 top-0 z-10 rounded-full bg-[linear-gradient(135deg,#B76E79,#C98B57)] px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_6px_16px_rgba(201,164,92,0.18)]">
                        {source.badge}
                      </span>
                    )}
                  </div>

                  <div className="mt-2">
                    <div className="mt-2">
                      <p className="line-clamp-1 text-[13px] font-semibold text-[#F5F1E8]">
                        {source.name}
                      </p>
                      <p className="mt-1 line-clamp-2 min-h-[40px] text-[12px] leading-5 text-[#8F887C]">
                        {source.description ?? "Buka source"}
                      </p>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[10px] text-[#8F887C]">
                      {source.description ?? "Buka source"}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-center gap-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.28em] text-[#8F887C]">
              Jelajah Lainnya
            </h2>
            <span className="rounded-full bg-[#C9A45C]/12 px-2.5 py-1 text-xs font-semibold text-[#E6D3A3]">
              {otherSources.length}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {otherSources.map((source) => (
              <button
                key={source.id}
                onClick={() => onSelectSource(source)}
                className="rounded-[24px] border border-white/10 bg-[#12131A] px-4 py-4 text-left shadow-[0_18px_36px_rgba(0,0,0,0.18)] transition hover:border-[#C9A45C]/20"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[22px]">
                    {source.logo ? (
                      <Image
                        src={source.logo}
                        alt={source.name}
                        width={46}
                        height={46}
                        className="h-[46px] w-[46px] rounded-[18px] object-contain"
                      />
                    ) : (
                      <span className="text-base font-bold text-[#E6D3A3]">
                        {source.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 self-start">
                    <p className="truncate text-[13px] font-semibold text-[#F5F1E8]">
                      {source.name}
                    </p>
                    <p className="mt-1 line-clamp-2 min-h-[40px] text-[12px] leading-5 text-[#8F887C]">
                      {source.description ?? "Buka source"}
                    </p>
                  </div>

                  <div className="shrink-0 text-[#6F6A61]">›</div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-white/10 bg-[#12131A] px-6 py-5 shadow-[0_18px_36px_rgba(0,0,0,0.18)]">
          <div className="grid grid-cols-3 text-center">
            <div>
              <p className="text-3xl font-bold text-[#D9B36A]">12</p>
              <p className="mt-2 text-[12px] uppercase tracking-[0.2em] text-[#8F887C]">
                Sumber
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#D9B36A]">50K+</p>
              <p className="mt-2 text-[12px] uppercase tracking-[0.2em] text-[#8F887C]">
                Drama
              </p>
            </div>
            <div>
              <p className="text-3xl font-bold text-[#D9B36A]">24/7</p>
              <p className="mt-2 text-[12px] uppercase tracking-[0.2em] text-[#8F887C]">
                Streaming
              </p>
            </div>
          </div>
        </section>

        <div className="mt-8 text-center">
          <p className="text-[22px] font-bold tracking-wide text-[#C9A45C]">
            DRAMALOTUS
          </p>
          <p className="mt-2 text-[13px] text-[#7E786D]">
            Mini App by DRAMALOTUS • Built by DRAMALOTUS
          </p>
        </div>

        <nav className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-[28px] border border-white/10 bg-[#12131A]/95 p-3 backdrop-blur">
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            <button className="rounded-2xl bg-[linear-gradient(135deg,rgba(201,164,92,0.22),rgba(185,138,132,0.12))] px-3 py-2 font-medium text-[#F2E6C9] shadow-[0_6px_18px_rgba(201,164,92,0.12)]">
              Beranda
            </button>
            <button
              onClick={onOpenHistory}
              className="rounded-2xl px-3 py-2 text-[#B8AA8A] transition hover:bg-[#C9A45C]/10 hover:text-[#E6D3A3]"
            >
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
