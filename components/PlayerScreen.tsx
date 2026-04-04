"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Hls, { type ErrorData } from "hls.js";
import type { Drama } from "@/types/drama";
import type { Episode } from "@/types/episode";

type PlayerScreenProps = {
  selectedDrama: Drama;
  selectedEpisode: Episode | null;
  episodes: Episode[];
  showEpisodes: boolean;
  membershipStatus: "free" | "vip";
  isLoadingEpisodes?: boolean;
  episodesError?: string | null;
  onBack: () => void;
  onOpenEpisodes: () => void;
  onCloseEpisodes: () => void;
  onSelectEpisode: (episode: Episode) => void;
};

type SubtitleCue = {
  start: number;
  end: number;
  text: string;
};

function formatSeconds(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "00:00";

  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

function stripSubtitleTags(value: string): string {
  return value.replace(/<[^>]+>/g, "").trim();
}

function parseTimestamp(value: string): number {
  const cleaned = value.trim().replace(",", ".");
  const [hours, minutes, seconds] = cleaned.split(":");

  return (
    Number(hours || 0) * 3600 + Number(minutes || 0) * 60 + Number(seconds || 0)
  );
}

function parseSubtitleText(text: string): SubtitleCue[] {
  const normalized = text.replace(/\r/g, "").trim();
  if (!normalized) return [];

  const body = normalized.startsWith("WEBVTT")
    ? normalized.replace(/^WEBVTT\s*/i, "")
    : normalized;

  const blocks = body.split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) continue;

    const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeLineIndex === -1) continue;

    const timeLine = lines[timeLineIndex];
    const [startRaw, endRaw] = timeLine.split("-->").map((part) => part.trim());

    if (!startRaw || !endRaw) continue;

    const start = parseTimestamp(startRaw.split(" ")[0]);
    const end = parseTimestamp(endRaw.split(" ")[0]);

    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;

    const textLines = lines.slice(timeLineIndex + 1);
    if (textLines.length === 0) continue;

    const cueText = stripSubtitleTags(textLines.join("\n"));
    if (!cueText) continue;

    cues.push({
      start,
      end,
      text: cueText,
    });
  }

  return cues;
}

export default function PlayerScreen({
  selectedDrama,
  selectedEpisode,
  episodes,
  showEpisodes,
  membershipStatus,
  isLoadingEpisodes = false,
  episodesError = null,
  onBack,
  onOpenEpisodes,
  onCloseEpisodes,
  onSelectEpisode,
}: PlayerScreenProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [shouldAutoplayNext, setShouldAutoplayNext] = useState(false);

  const [netshortSubtitleCues, setNetshortSubtitleCues] = useState<
    SubtitleCue[]
  >([]);
  const [activeNetshortSubtitle, setActiveNetshortSubtitle] = useState("");

  const isNetshortDrama = useMemo(() => {
    return (
      selectedDrama.sourceName === "Netshort" ||
      selectedDrama.source?.toLowerCase() === "netshort"
    );
  }, [selectedDrama]);

  const videoSrc = useMemo(
    () => selectedEpisode?.videoUrl?.trim() ?? "",
    [selectedEpisode?.videoUrl],
  );

  const subtitleSrc = useMemo(
    () => selectedEpisode?.subtitleUrl?.trim() ?? "",
    [selectedEpisode?.subtitleUrl],
  );

  const subtitleLang = useMemo(
    () => selectedEpisode?.subtitleLang?.trim() || "id-ID",
    [selectedEpisode?.subtitleLang],
  );

  const subtitleLabel = useMemo(
    () => selectedEpisode?.subtitleLabel?.trim() || "Indonesian",
    [selectedEpisode?.subtitleLabel],
  );

  const currentEpisodeIndex = useMemo(() => {
    if (!selectedEpisode) return -1;
    return episodes.findIndex((episode) => episode.id === selectedEpisode.id);
  }, [episodes, selectedEpisode]);

  const prevEpisode =
    currentEpisodeIndex > 0 ? episodes[currentEpisodeIndex - 1] : null;

  const nextEpisode =
    currentEpisodeIndex >= 0 && currentEpisodeIndex < episodes.length - 1
      ? episodes[currentEpisodeIndex + 1]
      : null;

  const goToEpisode = (episode: Episode, autoplay = false) => {
    setShouldAutoplayNext(autoplay);
    onSelectEpisode(episode);
  };

  useEffect(() => {
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setVideoError(null);
    setNetshortSubtitleCues([]);
    setActiveNetshortSubtitle("");

    if (videoSrc) {
      setShouldAutoplayNext(true);
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
  }, [selectedEpisode?.id, videoSrc, subtitleSrc]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !videoSrc) return;

    setVideoError(null);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHlsStream =
      videoSrc.includes(".m3u8") ||
      videoSrc.includes("application/vnd.apple.mpegurl");

    if (!isHlsStream) {
      video.src = videoSrc;
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoSrc;
      return;
    }

    if (!Hls.isSupported()) {
      setVideoError("Browser/WebView ini belum mendukung stream video HLS.");
      return;
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
    });

    hlsRef.current = hls;
    hls.loadSource(videoSrc);
    hls.attachMedia(video);

    const handleHlsError = (_event: string, data: ErrorData) => {
      console.error("HLS error:", data);

      if (!data.fatal) return;

      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          setVideoError("Jaringan bermasalah saat memuat video.");
          hls.startLoad();
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          setVideoError(
            "Video berhasil dimuat, tetapi codec video tidak sepenuhnya didukung WebView ini.",
          );
          hls.recoverMediaError();
          break;
        default:
          setVideoError("Video gagal diputar di browser ini.");
          hls.destroy();
          hlsRef.current = null;
      }
    };

    hls.on(Hls.Events.ERROR, handleHlsError);

    return () => {
      hls.off(Hls.Events.ERROR, handleHlsError);
      hls.destroy();
      hlsRef.current = null;
    };
  }, [videoSrc]);

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isNetshortDrama || !subtitleSrc) {
      setNetshortSubtitleCues([]);
      setActiveNetshortSubtitle("");
      return;
    }

    let cancelled = false;

    const loadNetshortSubtitle = async () => {
      try {
        const response = await fetch(subtitleSrc, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Subtitle fetch failed: ${response.status}`);
        }

        const text = await response.text();
        if (cancelled) return;

        const cues = parseSubtitleText(text);
        setNetshortSubtitleCues(cues);
      } catch (error) {
        console.error("Gagal memuat subtitle Netshort:", error);
        if (!cancelled) {
          setNetshortSubtitleCues([]);
          setActiveNetshortSubtitle("");
        }
      }
    };

    loadNetshortSubtitle();

    return () => {
      cancelled = true;
    };
  }, [isNetshortDrama, subtitleSrc]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !isNetshortDrama || netshortSubtitleCues.length === 0) {
      setActiveNetshortSubtitle("");
      return;
    }

    const updateSubtitle = () => {
      const current = video.currentTime;
      const activeCue = netshortSubtitleCues.find(
        (cue) => current >= cue.start && current <= cue.end,
      );

      setActiveNetshortSubtitle(activeCue?.text || "");
    };

    video.addEventListener("timeupdate", updateSubtitle);
    updateSubtitle();

    return () => {
      video.removeEventListener("timeupdate", updateSubtitle);
    };
  }, [isNetshortDrama, netshortSubtitleCues]);

  const handleLoadedMetadata = async () => {
    const video = videoRef.current;
    if (!video) return;

    setDuration(video.duration || 0);

    if (!isNetshortDrama && video.textTracks && video.textTracks.length > 0) {
      for (let i = 0; i < video.textTracks.length; i += 1) {
        video.textTracks[i].mode = i === 0 ? "showing" : "disabled";
      }
    }

    if (shouldAutoplayNext && videoSrc) {
      try {
        await video.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Failed to autoplay next video:", error);
        setVideoError("Episode berikutnya siap, tapi autoplay diblok browser.");
        setIsPlaying(false);
      } finally {
        setShouldAutoplayNext(false);
      }
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const current = video.currentTime || 0;
    const total = video.duration || 0;

    setCurrentTime(current);
    setDuration(total);

    if (total > 0) {
      setProgress((current / total) * 100);
    } else {
      setProgress(0);
    }
  };

  const handlePlayPause = async () => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    try {
      if (video.paused) {
        await video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("Failed to play video:", error);
      setVideoError(
        "Video tidak didukung penuh oleh browser/WebView. Coba buka langsung.",
      );
      setIsPlaying(false);
    }
  };

  const seekBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    const nextTime = Math.max(
      0,
      Math.min(video.duration || 0, video.currentTime + seconds),
    );
    video.currentTime = nextTime;
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setProgress(100);

    if (nextEpisode) {
      goToEpisode(nextEpisode, true);
    }
  };

  const handleVideoError = () => {
    setVideoError("Gagal memuat video episode ini.");
    setIsPlaying(false);
    setShouldAutoplayNext(false);
  };

  if (isLoadingEpisodes && !selectedEpisode) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
          <div className="w-full rounded-[28px] border border-white/10 bg-[#12131A] px-6 py-6 text-center">
            <p className="text-base font-semibold text-white">
              {selectedDrama.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#8F887C]">
              Memuat episode...
            </p>
            <button
              onClick={onBack}
              className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-[#DDD4C4]"
            >
              Kembali
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (episodesError && !selectedEpisode) {
    return (
      <main className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
          <div className="w-full rounded-[28px] border border-white/10 bg-[#12131A] px-6 py-6 text-center">
            <p className="text-base font-semibold text-white">
              {selectedDrama.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-[#8F887C]">
              {episodesError}
            </p>
            <button
              onClick={onBack}
              className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-[#DDD4C4]"
            >
              Kembali
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto min-h-screen w-full max-w-md px-4 pb-32 pt-20">
        <div className="fixed left-4 top-4 z-30">
          <button
            onClick={onBack}
            className="rounded-[18px] border border-white/10 bg-[#14151C]/90 px-4 py-2.5 text-sm font-medium text-[#E6D3A3] shadow-[0_6px_18px_rgba(0,0,0,0.22)] backdrop-blur"
          >
            ← Kembali
          </button>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#171822_0%,#101117_100%)] shadow-[0_24px_60px_rgba(0,0,0,0.32)]">
          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.16em] text-[#B8AA8A]">
                  Sedang memutar
                </p>
                <h1 className="mt-1 line-clamp-2 text-[22px] font-bold leading-7 text-white">
                  {selectedDrama.title}
                </h1>
                <p className="mt-1 line-clamp-1 text-sm text-[#8F887C]">
                  {selectedEpisode
                    ? selectedEpisode.title
                    : "Episode belum dipilih"}
                </p>
              </div>

              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                  membershipStatus === "vip"
                    ? "bg-[#D4AF37]/15 text-[#F3D27A]"
                    : "bg-white/8 text-[#CFC5B5]"
                }`}
              >
                {membershipStatus === "vip" ? "VIP" : "FREE"}
              </span>
            </div>

            {videoSrc && (
              <a
                href={videoSrc}
                target="_blank"
                rel="noreferrer"
                className="mt-4 block w-full rounded-[18px] border border-white/10 bg-white/10 px-4 py-3 text-center text-sm font-medium text-white"
              >
                Buka video langsung
              </a>
            )}

            <div className="mt-4 overflow-hidden rounded-[22px] border border-white/10 bg-black">
              <div className="relative aspect-[9/16] w-full bg-black">
                {videoSrc ? (
                  <video
                    key={`${selectedEpisode?.id}-${subtitleSrc}`}
                    ref={videoRef}
                    controls={false}
                    playsInline
                    preload="metadata"
                    crossOrigin="anonymous"
                    className="h-full w-full object-contain bg-black"
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={handleVideoEnded}
                    onError={handleVideoError}
                  >
                    {!isNetshortDrama && subtitleSrc ? (
                      <track
                        kind="subtitles"
                        src={subtitleSrc}
                        srcLang={subtitleLang}
                        label={subtitleLabel}
                        default
                      />
                    ) : null}
                  </video>
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center">
                    <div>
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-2xl">
                        ▶
                      </div>
                      <p className="mt-3 text-sm text-white/65">
                        Video episode belum tersedia
                      </p>
                    </div>
                  </div>
                )}

                {isNetshortDrama && activeNetshortSubtitle ? (
                  <div className="pointer-events-none absolute left-1/2 top-[72%] z-20 w-[82%] -translate-x-1/2 -translate-y-1/2 text-center">
                    <div className="inline rounded px-3 py-1.5 text-[17px] font-semibold leading-6 text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.95)]">
                      {activeNetshortSubtitle}
                    </div>
                  </div>
                ) : null}

                {videoError && (
                  <div className="absolute inset-x-3 bottom-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-100">
                    {videoError}
                  </div>
                )}

                {subtitleSrc ? (
                  <div className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white/85 backdrop-blur">
                    CC {subtitleLabel}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 h-1.5 w-full rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#B76E79,#C9A45C,#E6D3A3)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-white/60">
                <span>{formatSeconds(currentTime)}</span>
                <span>
                  {duration > 0
                    ? formatSeconds(duration)
                    : selectedEpisode?.duration || "--:--"}
                </span>
              </div>

              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  onClick={() => prevEpisode && goToEpisode(prevEpisode, true)}
                  disabled={!prevEpisode}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  onClick={() => seekBy(-10)}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm"
                >
                  -10
                </button>
                <button
                  onClick={handlePlayPause}
                  disabled={!videoSrc}
                  className="rounded-full bg-[linear-gradient(135deg,#B76E79,#C9A45C)] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(201,164,92,0.18)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPlaying ? "Pause" : "Play"}
                </button>
                <button
                  onClick={() => seekBy(10)}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm"
                >
                  +10
                </button>
                <button
                  onClick={() => nextEpisode && goToEpisode(nextEpisode, true)}
                  disabled={!nextEpisode}
                  className="rounded-full bg-white/10 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>

              <button
                onClick={onOpenEpisodes}
                className="mt-4 w-full rounded-[20px] border border-white/10 bg-[#171922] px-4 py-3 text-sm font-medium text-[#E6D3A3]"
              >
                Daftar Episode
              </button>
            </div>
          </div>
        </div>

        {showEpisodes && (
          <div
            className="fixed inset-0 z-20 flex items-end bg-black/60"
            onClick={onCloseEpisodes}
          >
            <div
              className="w-full max-h-[75vh] rounded-t-[28px] border border-white/10 bg-[linear-gradient(180deg,#171822_0%,#101117_100%)] p-4 shadow-[0_-18px_40px_rgba(0,0,0,0.35)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-[20px] font-bold text-white">
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

              {episodes.length === 0 ? (
                <div className="rounded-[20px] border border-white/8 bg-[#171922] px-4 py-5 text-center text-sm text-[#8F887C]">
                  Episode belum tersedia.
                </div>
              ) : (
                <div className="max-h-[60vh] overflow-y-auto pr-1">
                  <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-5">
                    {episodes.map((episode) => (
                      <button
                        key={episode.id}
                        onClick={() => {
                          goToEpisode(episode, false);
                          onCloseEpisodes();
                        }}
                        className={`rounded-[18px] border px-3 py-3 text-sm font-semibold transition ${
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
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
