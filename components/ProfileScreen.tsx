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
  return (
    <main className="min-h-screen bg-[#0b0b0f] text-white">
      <div className="mx-auto min-h-screen w-full max-w-md px-4 pb-24 pt-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-[30px] font-bold tracking-tight text-white">
              Profil Saya
            </h1>
            <p className="mt-1 text-sm text-[#8F887C]">
              Kelola akun dan status membership Anda
            </p>
          </div>

          <button
            onClick={onBack}
            className="rounded-[18px] border border-white/10 bg-[#14151C] px-4 py-2.5 text-sm font-medium text-[#E6D3A3] shadow-[0_6px_18px_rgba(0,0,0,0.22)]"
          >
            Kembali
          </button>
        </header>

        <div className="rounded-[30px] border border-white/10 bg-[#12131A] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(135deg,#D4AF37,#B76E79)] text-[22px] font-bold text-black shadow-[0_10px_24px_rgba(212,175,55,0.18)]">
              {telegramUserName?.trim()
                ? telegramUserName
                    .trim()
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part.charAt(0).toUpperCase())
                    .join("")
                : "TG"}
            </div>

            <div>
              <h2 className="text-[28px] font-bold leading-none text-white">
                {telegramUserName?.trim()
                  ? telegramUserName
                  : "Pengguna Telegram"}
              </h2>
              <p className="mt-1 text-[18px] text-[#9E978B]">
                ID Telegram belum tervalidasi
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/8 bg-[#14151D] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-[30px] ${
                  membershipStatus === "vip"
                    ? "bg-[linear-gradient(135deg,rgba(212,175,55,0.22),rgba(243,210,122,0.10))]"
                    : "bg-[linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]"
                }`}
              >
                {membershipStatus === "vip" ? "💎" : "🔒"}
              </div>

              <div className="min-w-0">
                <p className="text-[15px] text-[#8F887C]">Status Akun</p>
                <p
                  className={`mt-1 text-[24px] font-bold leading-none ${
                    membershipStatus === "vip" ? "text-[#F3D27A]" : "text-white"
                  }`}
                >
                  {membershipStatus === "vip" ? "VIP Member" : "Pengguna Biasa"}
                </p>
                <p className="mt-3 text-[15px] leading-6 text-[#8F887C]">
                  {membershipStatus === "vip"
                    ? "Akses premium aktif. Menonton tanpa iklan."
                    : "Upgrade VIP untuk akses tanpa iklan."}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onToggleMembership}
            className={`mt-5 w-full rounded-[22px] px-4 py-4 text-[17px] font-semibold transition shadow-[0_12px_30px_rgba(0,0,0,0.18)] ${
              membershipStatus === "vip"
                ? "bg-gradient-to-r from-[#D4AF37] to-[#F3D27A] text-black"
                : "bg-gradient-to-r from-[#B76E79] via-[#C79A57] to-[#D4AF37] text-white"
            }`}
          >
            {membershipStatus === "vip" ? "💎 VIP Aktif" : "Upgrade ke VIP"}
          </button>

          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-[22px] bg-[#1A1C24] p-4">
              <p className="text-[26px] font-bold text-white">{historyCount}</p>
              <p className="mt-1 text-[13px] text-[#9E978B]">Riwayat</p>
            </div>
            <div className="rounded-[22px] bg-[#1A1C24] p-4">
              <p className="text-[26px] font-bold text-white">
                {favoriteCount}
              </p>
              <p className="mt-1 text-[13px] text-[#9E978B]">Favorit</p>
            </div>
            <div className="rounded-[22px] bg-[#1A1C24] p-4">
              <p className="truncate text-[16px] font-bold text-white">
                {mostWatchedLabel}
              </p>
              <p className="mt-1 text-[13px] text-[#9E978B]">Sering Nonton</p>
            </div>
          </div>
        </div>

        <nav className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-3xl border border-white/10 bg-[#14141b]/95 p-3 backdrop-blur">
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
