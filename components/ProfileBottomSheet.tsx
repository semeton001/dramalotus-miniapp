"use client";

type ProfileBottomSheetProps = {
  isOpen: boolean;
  membershipStatus: "free" | "vip";
  telegramUserName: string | null;
  telegramUserId: number | null;
  favoriteCount: number;
  historyCount: number;
  mostWatchedLabel: string;
  onClose: () => void;
  onToggleMembership: () => void;
};

function getInitials(name: string | null): string {
  if (!name || !name.trim()) return "U";

  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((part) => part.charAt(0).toUpperCase()).join("");

  return initials || "U";
}

export default function ProfileBottomSheet({
  isOpen,
  membershipStatus,
  telegramUserName,
  telegramUserId,
  favoriteCount,
  historyCount,
  mostWatchedLabel,
  onClose,
  onToggleMembership,
}: ProfileBottomSheetProps) {
  const initials = getInitials(telegramUserName);

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
            <h2 className="text-lg font-semibold text-white">Profil Saya</h2>
          </div>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-4 py-4">
          <div className="rounded-[22px] border border-white/8 bg-[#171922] p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#F6C667,#D99B5F)] text-2xl font-bold text-white">
                {initials}
              </div>

              <div className="min-w-0">
                <p className="truncate text-[18px] font-semibold text-white">
                  {telegramUserName ?? "Pengguna Telegram"}
                </p>
                <p className="mt-1 text-sm text-[#8F887C]">
                  ID: {telegramUserId ?? "-"}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleMembership}
            className="mt-4 flex w-full items-center gap-4 rounded-[22px] border border-white/8 bg-[#171922] p-4 text-left transition hover:bg-[#1B1E28]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#2A2D38,#1B1E28)] text-lg">
              {membershipStatus === "vip" ? "👑" : "🔐"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-lg font-semibold text-white">
                {membershipStatus === "vip" ? "VIP Aktif" : "Pengguna Biasa"}
              </p>
              <p className="mt-1 text-sm text-[#8F887C]">
                {membershipStatus === "vip"
                  ? "Kamu sedang memakai akses premium tanpa iklan"
                  : "Upgrade VIP untuk akses tanpa iklan"}
              </p>
            </div>
          </button>

          <div className="mt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#6F6A62]">
              Statistik
            </p>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-[20px] border border-white/8 bg-[#171922] px-4 py-5 text-center">
                <p className="text-4xl font-bold text-white">{historyCount}</p>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#8F887C]">
                  Riwayat
                </p>
              </div>

              <div className="rounded-[20px] border border-white/8 bg-[#171922] px-4 py-5 text-center">
                <p className="text-4xl font-bold text-white">{favoriteCount}</p>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#8F887C]">
                  Favorit
                </p>
              </div>

              <div className="rounded-[20px] border border-white/8 bg-[#171922] px-4 py-5 text-center">
                <p className="truncate text-2xl font-bold text-white">
                  {mostWatchedLabel || "-"}
                </p>
                <p className="mt-2 text-sm font-semibold uppercase tracking-[0.12em] text-[#8F887C]">
                  Sering Nonton
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}