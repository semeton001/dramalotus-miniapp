"use client";

type BottomTab = "home" | "history" | "favorites" | "profile";

type PersistentBottomNavProps = {
  activeTab: BottomTab;
  onGoHome: () => void;
  onGoHistory: () => void;
  onGoFavorites: () => void;
  onGoProfile: () => void;
};

const items: Array<{
  key: BottomTab;
  label: string;
  icon: string;
}> = [
  { key: "home", label: "Beranda", icon: "🏠" },
  { key: "history", label: "Riwayat", icon: "🕘" },
  { key: "favorites", label: "Favorit", icon: "❤" },
  { key: "profile", label: "Profil", icon: "👤" },
];

export default function PersistentBottomNav({
  activeTab,
  onGoHome,
  onGoHistory,
  onGoFavorites,
  onGoProfile,
}: PersistentBottomNavProps) {
  const onPress = (tab: BottomTab) => {
    if (tab === "home") onGoHome();
    if (tab === "history") onGoHistory();
    if (tab === "favorites") onGoFavorites();
    if (tab === "profile") onGoProfile();
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(12px,env(safe-area-inset-bottom))]">
      <nav className="pointer-events-auto w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,17,24,0.94)_0%,rgba(10,11,16,0.98)_100%)] p-2 shadow-[0_24px_60px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(230,211,163,0.28),transparent)]" />
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => {
            const active = activeTab === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onPress(item.key)}
                className={`relative rounded-[20px] px-2 py-3 text-center transition ${
                  active
                    ? "bg-[linear-gradient(135deg,rgba(201,164,92,0.18),rgba(183,110,121,0.18))] text-[#F5E6C5] shadow-[0_10px_24px_rgba(201,164,92,0.12)]"
                    : "text-[#A8A19A] hover:bg-white/[0.04] hover:text-[#E9DAB9]"
                }`}
              >
                {active ? (
                  <span className="absolute inset-x-3 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(230,211,163,0.45),transparent)]" />
                ) : null}

                <div className="text-[16px] leading-none">{item.icon}</div>
                <div className="mt-1 text-[11px] font-semibold tracking-[0.01em]">
                  {item.label}
                </div>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
