import { useEffect, useState } from "react";
import type { Drama } from "@/types/drama";
import type { Episode } from "@/types/episode";

type PlayerScreenProps = {
  selectedDrama: Drama;
  selectedEpisode: Episode | null;
  episodes: Episode[];
  showEpisodes: boolean;
  membershipStatus: "free" | "vip";
  onBack: () => void;
  onOpenEpisodes: () => void;
  onCloseEpisodes: () => void;
  onSelectEpisode: (episode: Episode) => void;
};

export default function PlayerScreen({
  selectedDrama,
  selectedEpisode,
  episodes,
  showEpisodes,
  membershipStatus,
  onBack,
  onOpenEpisodes,
  onCloseEpisodes,
  onSelectEpisode,
}: PlayerScreenProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const formatTime = (value: number) => {
    const totalSeconds = Math.floor((value / 100) * 130);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 5;
      });
    }, 500);

    return () => clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    setProgress(0);
    setIsPlaying(false);
  }, [selectedEpisode?.id]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col">
        <div className="relative flex-1">
          <div className="absolute left-4 top-4 z-10">
            <button
              onClick={onBack}
              className="rounded-[18px] border border-white/10 bg-[#14151C]/90 px-4 py-2.5 text-sm font-medium text-[#E6D3A3] shadow-[0_6px_18px_rgba(0,0,0,0.22)] backdrop-blur"
            >
              ← Kembali
            </button>
          </div>

          <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#1a1a22] to-black px-4">
            <div className="w-full">
              <div className="mx-auto aspect-[9/16] max-h-[80vh] w-full max-w-sm rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#171822_0%,#101117_100%)] shadow-[0_24px_60px_rgba(0,0,0,0.32)]">
                <div className="flex h-full flex-col justify-between p-4">
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-[#B8AA8A]">Sedang memutar</p>
                        <h1 className="mt-1 text-[24px] font-bold leading-8 text-white">
                          {selectedDrama.title}
                        </h1>
                        <p className="mt-1 text-sm text-[#8F887C]">
                          {selectedEpisode
                            ? selectedEpisode.title
                            : "Episode belum dipilih"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          membershipStatus === "vip"
                            ? "bg-[#D4AF37]/15 text-[#F3D27A]"
                            : "bg-white/8 text-[#CFC5B5]"
                        }`}
                      >
                        {membershipStatus === "vip" ? "VIP" : "FREE"}
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-3xl">
                      ▶
                    </div>
                    <p className="mt-4 text-sm text-white/65">
                      {isPlaying
                        ? "Sedang memutar preview"
                        : "Player siap diputar"}
                    </p>
                  </div>

                  {membershipStatus === "free" && (
                    <div className="mb-4 rounded-2xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-yellow-300/80">
                            Sponsored
                          </p>
                          <p className="mt-1 text-sm font-medium text-yellow-100">
                            Iklan untuk pengguna Free
                          </p>
                          <p className="mt-1 text-xs text-yellow-200/70">
                            Upgrade ke VIP untuk menonton tanpa iklan.
                          </p>
                        </div>

                        <div className="rounded-xl bg-yellow-400/15 px-3 py-2 text-xs font-semibold text-yellow-200">
                          AD
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="mb-3 h-1.5 w-full rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#B76E79,#C9A45C,#E6D3A3)] transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>{formatTime(progress)}</span>
                      <span>
                        {selectedEpisode ? selectedEpisode.duration : "--:--"}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-4">
                      <button className="rounded-full bg-white/10 px-4 py-2 text-sm">
                        -10
                      </button>
                      <button
                        onClick={() => setIsPlaying((prev) => !prev)}
                        className="rounded-full bg-[linear-gradient(135deg,#B76E79,#C9A45C)] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(201,164,92,0.18)]"
                      >
                        {isPlaying ? "Pause" : "Play"}
                      </button>
                      <button className="rounded-full bg-white/10 px-4 py-2 text-sm">
                        +10
                      </button>
                    </div>

                    <button
                      onClick={onOpenEpisodes}
                      className="mt-5 w-full rounded-[22px] border border-white/10 bg-[#171922] px-4 py-3 text-sm font-medium text-[#E6D3A3]"
                    >
                      Daftar Episode
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {showEpisodes && (
            <div className="fixed inset-0 z-20 flex items-end bg-black/60">
              <div className="w-full rounded-t-[32px] border border-white/10 bg-[linear-gradient(180deg,#171822_0%,#101117_100%)] p-5 shadow-[0_-18px_40px_rgba(0,0,0,0.35)]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-[22px] font-bold text-white">
                      Daftar Episode
                    </h2>
                    <p className="text-sm text-[#8F887C]">
                      {episodes.length} episode tersedia
                    </p>
                  </div>
                  <button
                    onClick={onCloseEpisodes}
                    className="rounded-full border border-white/10 bg-[#171922] px-3 py-1.5 text-sm font-medium text-[#E6D3A3]"
                  >
                    Tutup
                  </button>
                </div>
                <div className="grid grid-cols-5 gap-2.5">
                  {episodes.map((episode) => (
                    <button
                      key={episode.id}
                      onClick={() => {
                        onSelectEpisode(episode);
                        onCloseEpisodes();
                      }}
                      className={`rounded-[20px] border px-3 py-3 text-sm font-semibold transition ${
                        selectedEpisode?.id === episode.id
                          ? "border-[#C9A45C]/25 bg-[linear-gradient(135deg,rgba(201,164,92,0.22),rgba(185,138,132,0.12))] text-[#F2E6C9] shadow-[0_8px_20px_rgba(201,164,92,0.12)]"
                          : "border-white/8 bg-[#171922] text-[#B8AA8A]"
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-[15px]">
                          {episode.episodeNumber}
                        </span>
                        {selectedEpisode?.id === episode.id && (
                          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E6D3A3]">
                            Now
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
