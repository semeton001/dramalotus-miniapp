import type { Drama } from "@/types/drama";

type FavoritesScreenProps = {
  favoriteDramas: Drama[];
  onBack: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onSelectDrama: (drama: Drama) => void;
};

export default function FavoritesScreen({
  favoriteDramas,
  onBack,
  onOpenHistory,
  onOpenProfile,
  onSelectDrama,
}: FavoritesScreenProps) {
  return (
    <main className="min-h-screen bg-[#0b0b0f] text-white">
      <div className="mx-auto min-h-screen w-full max-w-md px-4 pb-24 pt-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-[30px] font-bold tracking-tight text-white">
              Favorit Saya
            </h1>
            <p className="mt-1 text-sm text-[#8F887C]">
              Kumpulan drama yang Anda simpan
            </p>
          </div>

          <button
            onClick={onBack}
            className="rounded-[18px] border border-white/10 bg-[#14151C] px-4 py-2.5 text-sm font-medium text-[#E6D3A3] shadow-[0_6px_18px_rgba(0,0,0,0.22)]"
          >
            Kembali
          </button>
        </header>

        {favoriteDramas.length === 0 ? (
          <div className="rounded-[30px] border border-white/10 bg-[#12131A] p-6 text-center shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
            <p className="text-lg font-semibold text-white">
              Belum ada favorit
            </p>
            <p className="mt-2 text-sm text-[#8F887C]">
              Tambahkan drama ke favorit agar muncul di sini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {favoriteDramas.map((drama) => (
              <button
                key={drama.id}
                onClick={() => onSelectDrama(drama)}
                className="overflow-hidden rounded-[24px] border border-white/10 bg-[#12131A] text-left shadow-[0_18px_40px_rgba(0,0,0,0.28)]"
              >
                <div
                  className={`aspect-[3/4] w-full bg-gradient-to-br ${drama.posterClass}`}
                />
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-white">
                    {drama.title}
                  </p>
                  <p className="mt-1 text-xs text-[#8F887C]">
                    {drama.episodes} episode
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

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
