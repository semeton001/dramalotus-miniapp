type ProfileScreenProps = {
  favoriteCount: number;
  historyCount: number;
  mostWatchedLabel: string;
  membershipStatus: "free" | "vip";
  telegramUserName?: string | null;
  telegramUserId?: number | null;
  onBack: () => void;
  onOpenHistory: () => void;
  onOpenFavorites: () => void;
  onToggleMembership: () => void;
};

export default function ProfileScreen({
  favoriteCount,
  historyCount,
  mostWatchedLabel,
  membershipStatus,
  telegramUserName,
  telegramUserId,
  onBack,
  onOpenHistory,
  onOpenFavorites,
  onToggleMembership,
}: ProfileScreenProps) {
  const displayName = telegramUserName?.trim()
    ? telegramUserName
    : "Pengguna Telegram";

  const initials = telegramUserName?.trim()
    ? telegramUserName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("")
    : "TG";

  const membershipLabel =
    membershipStatus === "vip" ? "VIP Member" : "Pengguna Biasa";

  const membershipDescription =
    membershipStatus === "vip"
      ? "Akses premium aktif. Menonton lebih nyaman tanpa iklan."
      : "Mode lokal aktif. Upgrade VIP untuk pengalaman yang lebih eksklusif.";

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,rgba(201,164,92,0.10),transparent_26%),#0B0B0F] text-white">
      <div className="mx-auto w-full max-w-[430px] min-h-[100dvh] px-4 pb-28 pt-6">
        <header className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[28px] font-bold tracking-tight text-white">
              Profil Saya
            </h1>
            <p className="mt-1 text-sm leading-6 text-[#8F887C]">
              Kelola akun, status membership, dan ringkasan aktivitas Anda.
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
          <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(135deg,rgba(201,164,92,0.10),rgba(183,110,121,0.08))] p-[1px]">
            <div className="rounded-[25px] bg-[#13151C] p-4 sm:p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#D4AF37,#B76E79)] text-[22px] font-bold text-black shadow-[0_12px_28px_rgba(212,175,55,0.20)]">
                  {initials}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-[24px] font-bold leading-none text-white">
                      {displayName}
                    </h2>
                    <span className="rounded-full border border-[#C9A45C]/20 bg-[#1A1C24] px-2.5 py-1 text-[11px] font-semibold text-[#E6D3A3]">
                      Lokal
                    </span>
                  </div>

                  <p className="mt-2 text-[14px] leading-6 text-[#9E978B]">
                    ID Telegram belum tervalidasi
                  </p>
                  <p className="text-[13px] leading-5 text-[#7F786D]">
                    Mode aman aktif untuk menjaga sinkronisasi akun tetap
                    stabil.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-[26px] border border-white/8 bg-[#14151D] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.22)] sm:p-5">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[28px] ${
                  membershipStatus === "vip"
                    ? "bg-[linear-gradient(135deg,rgba(212,175,55,0.24),rgba(243,210,122,0.10))]"
                    : "bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]"
                }`}
              >
                {membershipStatus === "vip" ? "💎" : "✨"}
              </div>

              <div className="min-w-0">
                <p className="text-[14px] text-[#8F887C]">Status Akun</p>
                <p
                  className={`mt-1 text-[22px] font-bold leading-none ${
                    membershipStatus === "vip" ? "text-[#F3D27A]" : "text-white"
                  }`}
                >
                  {membershipLabel}
                </p>
                <p className="mt-3 text-[14px] leading-6 text-[#8F887C]">
                  {membershipDescription}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onToggleMembership}
            className={`mt-5 w-full rounded-[22px] px-4 py-4 text-[16px] font-semibold transition shadow-[0_12px_30px_rgba(0,0,0,0.18)] ${
              membershipStatus === "vip"
                ? "bg-gradient-to-r from-[#D4AF37] to-[#F3D27A] text-black hover:brightness-105"
                : "bg-gradient-to-r from-[#B76E79] via-[#C79A57] to-[#D4AF37] text-white hover:brightness-105"
            }`}
          >
            {membershipStatus === "vip" ? "💎 VIP Aktif" : "Upgrade ke VIP"}
          </button>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-[22px] border border-white/6 bg-[#171922] p-4 shadow-[0_8px_20px_rgba(0,0,0,0.14)]">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#8F887C]">
                Riwayat
              </p>
              <p className="mt-2 text-[26px] font-bold text-white">
                {historyCount}
              </p>
              <p className="mt-1 text-[12px] text-[#9E978B]">Drama dibuka</p>
            </div>

            <div className="rounded-[22px] border border-white/6 bg-[#171922] p-4 shadow-[0_8px_20px_rgba(0,0,0,0.14)]">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#8F887C]">
                Favorit
              </p>
              <p className="mt-2 text-[26px] font-bold text-white">
                {favoriteCount}
              </p>
              <p className="mt-1 text-[12px] text-[#9E978B]">Tersimpan</p>
            </div>

            <div className="rounded-[22px] border border-white/6 bg-[#171922] p-4 shadow-[0_8px_20px_rgba(0,0,0,0.14)]">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#8F887C]">
                Top Source
              </p>
              <p className="mt-2 truncate text-[15px] font-bold text-white">
                {mostWatchedLabel}
              </p>
              <p className="mt-1 text-[12px] text-[#9E978B]">Paling sering</p>
            </div>
          </div>
        </section>

        <nav className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] left-1/2 w-[calc(100%-24px)] max-w-[430px] -translate-x-1/2 rounded-3xl border border-white/10 bg-[#14141b]/95 p-3 backdrop-blur">
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
            <button
              onClick={onOpenFavorites}
              className="rounded-2xl px-3 py-2 text-[#B8AA8A] transition hover:bg-[#C9A45C]/10 hover:text-[#E6D3A3]"
            >
              Favorit
            </button>
            <button className="rounded-2xl bg-[linear-gradient(135deg,rgba(201,164,92,0.22),rgba(185,138,132,0.12))] px-3 py-2 font-medium text-[#F2E6C9] shadow-[0_6px_18px_rgba(201,164,92,0.12)]">
              Profil
            </button>
          </div>
        </nav>
      </div>
    </main>
  );
}
