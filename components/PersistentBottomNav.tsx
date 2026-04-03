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
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
      <nav className="pointer-events-auto w-full max-w-md rounded-[26px] border border-white/10 bg-[#0F1118]/95 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="grid grid-cols-4 gap-2">
          {items.map((item) => {
            const active = activeTab === item.key;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onPress(item.key)}
                className={`rounded-[20px] px-2 py-3 text-center transition ${
                  active
                    ? "bg-[linear-gradient(135deg,rgba(201,164,92,0.18),rgba(183,110,121,0.18))] text-[#F5E6C5]"
                    : "text-[#A8A19A] hover:bg-white/[0.03]"
                }`}
              >
                <div className="text-[16px] leading-none">{item.icon}</div>
                <div className="mt-1 text-[11px] font-semibold">
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