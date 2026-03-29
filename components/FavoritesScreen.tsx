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
              Favorit
            </h1>
            <p className="mt-1 text-sm text-[#8F887C]">
              Daftar drama yang sudah Anda simpan
            </p>
          </div>

          <button
            onClick={onBack}
            className="rounded-[18px] border border-white/10 bg-[#14151C] px-4 py-2.5 text-sm font-medium text-[#E6D3A3] shadow-[0_6px_18px_rgba(0,0,0,0.22)]"
          >
            Kembali
          </button>
        </header>

        <div className="space-y-3">
          {favoriteDramas.length === 0 ? (
            <div className="rounded-[28px] border border-white/10 bg-[#12131A] p-6 text-center shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
              <p className="text-lg font-semibold text-white">
                Belum ada favorit
              </p>
              <p className="mt-2 text-sm leading-6 text-[#8F887C]">
                Simpan drama favorit Anda untuk akses lebih cepat nanti.
              </p>
            </div>
          ) : (
            favoriteDramas.map((drama) => (
              <button
                key={drama.id}
                onClick={() => onSelectDrama(drama)}
                className="w-full rounded-[28px] border border-white/10 bg-[#12131A] p-4 text-left shadow-[0_18px_40px_rgba(0,0,0,0.22)] transition hover:border-[#C9A45C]/20"
              >
                <div className="flex gap-4">
                  <div className="h-24 w-16 rounded-[18px] border border-white/8 bg-gradient-to-b from-[#B76E79]/35 via-[#C9A45C]/12 to-white/[0.03]" />
                  <div className="flex-1">
                    <p className="text-[18px] font-semibold leading-6 text-white">
                      {drama.title}
                    </p>
                    <p className="mt-1 text-sm text-[#C9A45C]">
                      {drama.source}
                    </p>
                    <p className="mt-2 text-sm text-[#CFC5B5]">
                      {drama.episodes} Episode
                    </p>
                    <p className="mt-2 text-xs font-medium text-[#E6D3A3]">
                      Tersimpan di favorit
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <nav className="fixed bottom-4 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-3xl border border-white/10 bg-[#14141b]/95 p-3 backdrop-blur">
          <div className="grid grid-cols-4 text-center text-sm">
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
            <button className="rounded-2xl px-3 py-2 text-[#B8AA8A] transition hover:bg-[#C9A45C]/10 hover:text-[#E6D3A3]">
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
