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

function SourceLogo({ source }: { source: Source }) {
  if (source.logo) {
    return (
      <Image
        src={source.logo}
        alt={source.name}
        width={72}
        height={72}
        className="h-[72px] w-[72px] rounded-[22px] object-contain"
      />
    );
  }

  return (
    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] border border-[#C9A45C]/20 bg-[linear-gradient(135deg,rgba(201,164,92,0.18),rgba(183,110,121,0.12))] text-[26px] font-bold text-[#F2E6C9] shadow-[0_12px_30px_rgba(0,0,0,0.24)]">
      {source.name.charAt(0)}
    </div>
  );
}

function SourceBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#E7C98B]/10 bg-[linear-gradient(135deg,#B76E79,#C98B57)] px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_8px_18px_rgba(201,164,92,0.18)]">
      {label}
    </span>
  );
}

export default function HomeScreen({
  popularSources,
  otherSources,
  onSelectSource,
  onOpenHistory,
  onOpenFavorites,
  onOpenProfile,
}: HomeScreenProps) {
  const popularMelolo = popularSources.find(
    (source) => source.name.toLowerCase() === "melolo",
  );
  const otherNetshort = otherSources.find(
    (source) => source.name.toLowerCase() === "netshort",
  );

  const displayedPopularSources =
    popularMelolo && otherNetshort
      ? popularSources.map((source) =>
          source.name.toLowerCase() === "melolo" ? otherNetshort : source,
        )
      : popularSources;

  const displayedOtherSources =
    popularMelolo && otherNetshort
      ? otherSources.map((source) =>
          source.name.toLowerCase() === "netshort" ? popularMelolo : source,
        )
      : otherSources;

  const totalSourceCount = popularSources.length + otherSources.length;

  return (
    <main className="min-h-[100dvh] overflow-x-hidden bg-[#050507] text-[#F5F1E8]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,164,92,0.14),transparent_28%)]" />
        <div className="absolute left-1/2 top-[18%] h-[320px] w-[320px] -translate-x-1/2 rounded-full bg-[#B76E79]/[0.08] blur-3xl" />
        <div className="absolute bottom-[8%] left-1/2 h-[260px] w-[260px] -translate-x-1/2 rounded-full bg-[#C9A45C]/[0.08] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,7,0.72)_0%,rgba(5,5,7,0.92)_34%,rgba(5,5,7,1)_100%)]" />
      </div>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col px-4 pb-32 pt-5">
        <header className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,19,26,0.96)_0%,rgba(12,13,19,0.98)_100%)] px-5 py-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,164,92,0.18),transparent_34%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(183,110,121,0.12),transparent_28%)]" />
          <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(230,211,163,0.3),transparent)]" />

          <div className="relative text-center">
            <div
              className={`${cinzel.className} mx-auto inline-flex items-center gap-2 rounded-full border border-[#C9A45C]/15 bg-[#171922]/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#DCC38A]`}
            >
              <span className="h-2 w-2 rounded-full bg-[#C9A45C] shadow-[0_0_12px_rgba(201,164,92,0.8)]" />
              DRAMALOTUS PREMIERE SELECTION
            </div>

            <div className="relative mx-auto mt-5 flex h-28 w-28 items-center justify-center">
              <div className="absolute inset-0 rounded-[30px] bg-[#C9A45C]/10 blur-2xl" />
              <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-[30px] border border-[#C9A45C]/15 bg-[linear-gradient(135deg,rgba(201,164,92,0.12),rgba(185,138,132,0.05))] shadow-[0_0_80px_rgba(201,164,92,0.08)]">
                <Image
                  src="/dramalotus-logo.png"
                  alt="DRAMALOTUS Logo"
                  width={112}
                  height={112}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <h1 className="mt-5 text-[36px] font-extrabold tracking-[0.03em] text-[#D9B36A] [text-shadow:0_0_28px_rgba(201,164,92,0.22)]">
              DRAMALOTUS
            </h1>

            <p className="mx-auto mt-2 max-w-xs text-center text-[14px] leading-6 text-[#D7CBB7]">
              Drama pendek paling panas, penuh romansa,
              <br />
              siap menemani harimu.
            </p>
          </div>
        </header>

        <section className="mt-5">
          <div className="mb-4 flex items-center justify-between px-1">
            <div>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.28em] text-[#8F887C]">
                Populer
              </h2>
              <p className="mt-1 text-[12px] text-[#6F6A61]">
                Pilihan source paling sering dibuka.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenProfile}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-semibold text-[#DCC38A] transition hover:bg-white/[0.06]"
            >
              Profil
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {displayedPopularSources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => onSelectSource(source)}
                className="group rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,19,26,0.98)_0%,rgba(12,13,19,0.98)_100%)] px-2.5 py-3 text-center shadow-[0_14px_28px_rgba(0,0,0,0.2)] transition hover:-translate-y-0.5 hover:border-[#C9A45C]/25 hover:shadow-[0_20px_40px_rgba(0,0,0,0.26)]"
              >
                <div className="flex min-h-[118px] flex-col items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 scale-90 rounded-[22px] bg-[#C9A45C]/10 blur-xl transition group-hover:bg-[#C9A45C]/14" />
                    <div className="relative scale-90">
                      <SourceLogo source={source} />
                    </div>

                    <div className="absolute -right-2 -top-1">
                      <SourceBadge label="HOT" />
                    </div>
                  </div>

                  <p className="mt-2 line-clamp-1 w-full text-[12px] font-semibold text-[#F5F1E8]">
                    {source.name}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between px-1">
            <div>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.28em] text-[#8F887C]">
                Jelajah Lainnya
              </h2>
              <p className="mt-1 text-[12px] text-[#6F6A61]">
                Koleksi source tambahan untuk kamu eksplor.
              </p>
            </div>
            <span className="rounded-full border border-[#C9A45C]/15 bg-[#C9A45C]/10 px-2.5 py-1 text-[11px] font-semibold text-[#E6D3A3]">
              {displayedOtherSources.length}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {displayedOtherSources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => onSelectSource(source)}
                className="group rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,19,26,0.98)_0%,rgba(12,13,19,0.98)_100%)] px-4 py-4 text-left shadow-[0_18px_36px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:border-[#C9A45C]/20"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[20px] border border-white/8 bg-white/[0.02]">
                    {source.logo ? (
                      <Image
                        src={source.logo}
                        alt={source.name}
                        width={48}
                        height={48}
                        className="h-[48px] w-[48px] rounded-[16px] object-contain"
                      />
                    ) : (
                      <span className="text-base font-bold text-[#E6D3A3]">
                        {source.name.charAt(0)}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#F5F1E8]">
                      {source.name}
                    </p>
                    <p className="mt-1 line-clamp-2 min-h-[34px] text-[11px] leading-5 text-[#8F887C]">
                      {source.description ?? "Buka source"}
                    </p>
                  </div>

                  <div className="shrink-0 text-lg text-[#6F6A61] transition group-hover:text-[#E6D3A3]">
                    ›
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,19,26,0.96)_0%,rgba(12,13,19,0.98)_100%)] px-6 py-5 shadow-[0_18px_36px_rgba(0,0,0,0.18)]">
          <div className="pointer-events-none absolute" />
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="mx-auto min-w-[74px] text-center text-3xl font-bold tabular-nums text-[#D9B36A]">{totalSourceCount}</p>
              <p className="mt-2 text-[12px] uppercase tracking-[0.2em] text-[#8F887C]">
                SOURCE
              </p>
            </div>
            <div>
              <p className="mx-auto min-w-[74px] text-center text-3xl font-bold tabular-nums text-[#D9B36A]">50K+</p>
              <p className="mt-2 text-[12px] uppercase tracking-[0.2em] text-[#8F887C]">
                Drama
              </p>
            </div>
            <div>
              <p className="mx-auto min-w-[74px] text-center text-3xl font-bold tabular-nums text-[#D9B36A]">24/7</p>
              <p className="mt-2 text-[12px] uppercase tracking-[0.2em] text-[#8F887C]">
                Streaming
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 border-t border-white/10 pt-7">
          <div className="px-1">
            <h2 className="text-[16px] font-semibold uppercase tracking-[0.24em] text-[#F5F1E8]">
              INFORMASI
            </h2>

            <div className="mt-5 overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.02]">
              <a
                href="/privacy"
                className="flex items-center justify-between px-4 py-4 text-left text-[15px] font-medium text-[#C9C4CF] transition hover:bg-white/[0.03] hover:text-white"
              >
                <span>Kebijakan Privasi</span>
                <span className="text-[#6F6A61]">›</span>
              </a>

              <div className="h-px bg-white/8" />

              <a
                href="/terms"
                className="flex items-center justify-between px-4 py-4 text-left text-[15px] font-medium text-[#C9C4CF] transition hover:bg-white/[0.03] hover:text-white"
              >
                <span>Syarat & Ketentuan</span>
                <span className="text-[#6F6A61]">›</span>
              </a>

              <div className="h-px bg-white/8" />

              <a
                href="https://t.me/Shenluoyi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-4 text-left text-[15px] font-medium text-[#C9C4CF] transition hover:bg-white/[0.03] hover:text-white"
              >
                <span>Hubungi Kami</span>
                <span className="text-[#6F6A61]">›</span>
              </a>
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
      </div>
    </main>
  );
}
