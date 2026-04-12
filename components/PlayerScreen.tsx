"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Hls, { type ErrorData } from "hls.js";
import type { Drama } from "@/types/drama";
import type { Episode } from "@/types/episode";
import type { ResolvedAdCampaign } from "@/types/ad";

type PlayerScreenProps = {
  selectedDrama: Drama;
  selectedEpisode: Episode | null;
  episodes: Episode[];
  showEpisodes: boolean;
  membershipStatus: "free" | "vip";
  shouldShowAds: boolean;
  adCampaign?: ResolvedAdCampaign | null;
  isLoadingEpisodes?: boolean;
  episodesError?: string | null;
  onBack: () => void;
  onOpenEpisodes: () => void;
  onCloseEpisodes: () => void;
  onSelectEpisode: (episode: Episode) => void;
  onSkipAd?: () => void;
  onCompleteAd?: () => void;
  onClickAdCta?: () => void;
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

function mergeFastSubtitleCues(
  cues: SubtitleCue[],
  options?: {
    maxGap?: number;
    maxDuration?: number;
    maxCharsPerLine?: number;
  },
): SubtitleCue[] {
  if (cues.length <= 1) return cues;

  const maxGap = options?.maxGap ?? 0.25;
  const maxDuration = options?.maxDuration ?? 4.6;
  const maxCharsPerLine = options?.maxCharsPerLine ?? 24;
  const maxTotalChars = maxCharsPerLine * 2;

  const merged: SubtitleCue[] = [];
  let current: SubtitleCue | null = null;

  const normalizeText = (value: string) =>
    value.replace(/\s+/g, " ").replace(/\n+/g, " ").trim();

  const toTwoLines = (first: string, second: string) => {
    const line1 = normalizeText(first);
    const line2 = normalizeText(second);

    if (!line1) return line2;
    if (!line2) return line1;
    return `${line1}\n${line2}`;
  };

  for (const cue of cues) {
    const cueText = normalizeText(cue.text);
    if (!cueText) continue;

    if (!current) {
      current = { ...cue, text: cueText };
      continue;
    }

    const currentText = normalizeText(current.text);
    const gap = cue.start - current.end;
    const combinedDuration = cue.end - current.start;
    const combinedChars = currentText.length + cueText.length;
    const currentLineCount = current.text.split("\n").filter(Boolean).length;

    const canMerge =
      gap >= 0 &&
      gap <= maxGap &&
      combinedDuration <= maxDuration &&
      currentLineCount < 2 &&
      currentText.length <= maxCharsPerLine &&
      cueText.length <= maxCharsPerLine &&
      combinedChars <= maxTotalChars;

    if (canMerge) {
      current = {
        start: current.start,
        end: cue.end,
        text: toTwoLines(currentText, cueText),
      };
      continue;
    }

    merged.push(current);
    current = { ...cue, text: cueText };
  }

  if (current) {
    merged.push(current);
  }

  return merged;
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

function buildEpisodeIdentity(episode: Episode | null | undefined): string {
  if (!episode) return "";

  const episodeNumber =
    typeof episode.episodeNumber === "number" ? episode.episodeNumber : -1;

  const videoUrl =
    typeof episode.videoUrl === "string" ? episode.videoUrl.trim() : "";

  const subtitleUrl =
    typeof episode.subtitleUrl === "string" ? episode.subtitleUrl.trim() : "";

  return `${episodeNumber}::${videoUrl}::${subtitleUrl}`;
}

function shouldShowAdGateForEpisode(
  episodeNumber: number,
  options?: {
    startEpisode?: number;
    interval?: number;
  },
): boolean {
  const startEpisode = options?.startEpisode ?? 3;
  const interval = options?.interval ?? 3;

  if (!Number.isFinite(episodeNumber) || episodeNumber <= 0) return false;
  if (episodeNumber < startEpisode) return false;

  return episodeNumber % interval === 0;
}

const FREE_EPISODE_LIMIT = 10;

function canAccessEpisodeByMembership(
  episode: Episode | null | undefined,
  membershipStatus: "free" | "vip",
): boolean {
  if (!episode) return false;
  if (membershipStatus === "vip") return true;

  const episodeNumber =
    typeof episode.episodeNumber === "number" ? episode.episodeNumber : 0;

  return (
    episodeNumber > 0 &&
    episodeNumber <= FREE_EPISODE_LIMIT &&
    !Boolean(episode.isLocked) &&
    !Boolean(episode.isVipOnly)
  );
}

function isEpisodeLockedByMembership(
  episode: Episode | null | undefined,
  membershipStatus: "free" | "vip",
): boolean {
  return !canAccessEpisodeByMembership(episode, membershipStatus);
}

export default function PlayerScreen({
  selectedDrama,
  selectedEpisode,
  episodes,
  showEpisodes,
  membershipStatus,
  shouldShowAds,
  adCampaign = null,
  isLoadingEpisodes = false,
  episodesError = null,
  onBack,
  onOpenEpisodes,
  onCloseEpisodes,
  onSelectEpisode,
  onSkipAd,
  onCompleteAd,
  onClickAdCta,
}: PlayerScreenProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const pendingAutoplayRef = useRef(false);
  const overlayHideTimerRef = useRef<number | null>(null);
  const freeReelsSubtitleRequestIdRef = useRef(0);
  const isSeekingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [shouldAutoplayNext, setShouldAutoplayNext] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenControls, setShowFullscreenControls] = useState(true);
  const [hasPassedAdGate, setHasPassedAdGate] = useState(false);
  const [adCountdown, setAdCountdown] = useState(5);
  const [canSkipAd, setCanSkipAd] = useState(false);

  const [resolvedReelifeUrl, setResolvedReelifeUrl] = useState("");
  const [isResolvingReelife, setIsResolvingReelife] = useState(false);
  const [resolvedFreeReelsUrl, setResolvedFreeReelsUrl] = useState("");
  const [resolvedFreeReelsSubtitleUrl, setResolvedFreeReelsSubtitleUrl] =
    useState("");
  const [isResolvingFreeReels, setIsResolvingFreeReels] = useState(false);

  const [netshortSubtitleCues, setNetshortSubtitleCues] = useState<
    SubtitleCue[]
  >([]);
  const [activeNetshortSubtitle, setActiveNetshortSubtitle] = useState("");

  const [freeReelsSubtitleCues, setFreeReelsSubtitleCues] = useState<
    SubtitleCue[]
  >([]);
  const [activeFreeReelsSubtitle, setActiveFreeReelsSubtitle] = useState("");

  const isNetshortDrama = useMemo(() => {
    return (
      selectedDrama.sourceName === "Netshort" ||
      selectedDrama.source?.toLowerCase() === "netshort"
    );
  }, [selectedDrama]);

  const isShortmaxDrama = useMemo(() => {
    return (
      selectedDrama.sourceName === "Shortmax" ||
      selectedDrama.source?.toLowerCase() === "shortmax"
    );
  }, [selectedDrama]);

  const isGoodshortDrama = useMemo(() => {
    return (
      selectedDrama.sourceName === "GoodShort" ||
      selectedDrama.source?.toLowerCase() === "goodshort"
    );
  }, [selectedDrama]);

  const isIdramaDrama = useMemo(() => {
    return (
      selectedDrama.sourceName === "iDrama" ||
      selectedDrama.source?.toLowerCase() === "idrama"
    );
  }, [selectedDrama]);

  const isReelifeDrama = useMemo(() => {
    return (
      selectedDrama.sourceName === "Reelife" ||
      selectedDrama.source?.toLowerCase() === "reelife"
    );
  }, [selectedDrama]);

  const isFreeReelsDrama = useMemo(() => {
    return (
      selectedDrama.sourceName === "FreeReels" ||
      selectedDrama.source?.toLowerCase() === "freereels"
    );
  }, [selectedDrama]);

  const isReelShortDrama = useMemo(() => {
    return (
      selectedDrama.sourceName === "ReelShort" ||
      selectedDrama.source?.toLowerCase() === "reelshort"
    );
  }, [selectedDrama]);

  const isVip = membershipStatus === "vip";
  const shouldPrepareAds = shouldShowAds && !isVip;

  const hasActiveAdCampaign = !!adCampaign?.active;
  const isImageAd = adCampaign?.mediaType === "image";
  const isVideoAd = adCampaign?.mediaType === "video";

  const AD_SKIP_DELAY_SECONDS = hasActiveAdCampaign
    ? (adCampaign?.skipAfterSeconds ?? 5)
    : 5;

  const AD_TOTAL_DURATION_SECONDS = hasActiveAdCampaign
    ? (adCampaign?.totalDurationSeconds ?? 10)
    : 10;

  const adHeadline = hasActiveAdCampaign
    ? adCampaign?.headline || "Jeda iklan"
    : "Jeda iklan";

  const adBody = hasActiveAdCampaign ? adCampaign?.body || "" : "";
  const adMediaUrl = hasActiveAdCampaign ? adCampaign?.mediaUrl || "" : "";

  const selectedEpisodeNumber =
    typeof selectedEpisode?.episodeNumber === "number"
      ? selectedEpisode.episodeNumber
      : 0;

  const selectedEpisodeLockedForMembership = useMemo(
    () => isEpisodeLockedByMembership(selectedEpisode, membershipStatus),
    [selectedEpisode, membershipStatus],
  );

  const shouldGateThisEpisode =
    !selectedEpisodeLockedForMembership && shouldPrepareAds && hasActiveAdCampaign;

  const adProgressPercent =
    AD_SKIP_DELAY_SECONDS > 0
      ? ((AD_SKIP_DELAY_SECONDS - adCountdown) / AD_SKIP_DELAY_SECONDS) * 100
      : 100;

  const usesSourceSpecificEpisodeIdentity =
    isNetshortDrama ||
    isShortmaxDrama ||
    isGoodshortDrama ||
    isIdramaDrama ||
    isReelifeDrama ||
    isFreeReelsDrama ||
    isReelShortDrama;

  const rawVideoSrc = useMemo(
    () => selectedEpisode?.videoUrl?.trim() ?? "",
    [selectedEpisode?.videoUrl],
  );

  const videoSrc = useMemo(() => {
    if (isReelifeDrama) {
      return resolvedReelifeUrl;
    }

    if (isFreeReelsDrama) {
      return resolvedFreeReelsUrl;
    }

    return rawVideoSrc;
  }, [
    isReelifeDrama,
    isFreeReelsDrama,
    rawVideoSrc,
    resolvedReelifeUrl,
    resolvedFreeReelsUrl,
  ]);

  const subtitleSrc = useMemo(() => {
    if (isFreeReelsDrama) {
      return (
        resolvedFreeReelsSubtitleUrl ||
        selectedEpisode?.subtitleUrl?.trim() ||
        ""
      );
    }

    return selectedEpisode?.subtitleUrl?.trim() ?? "";
  }, [
    isFreeReelsDrama,
    resolvedFreeReelsSubtitleUrl,
    selectedEpisode?.subtitleUrl,
  ]);

  const subtitleLang = useMemo(
    () => selectedEpisode?.subtitleLang?.trim() || "id-ID",
    [selectedEpisode?.subtitleLang],
  );

  const subtitleLabel = useMemo(
    () => selectedEpisode?.subtitleLabel?.trim() || "Indonesian",
    [selectedEpisode?.subtitleLabel],
  );

  const selectedEpisodeIdentity = useMemo(
    () => buildEpisodeIdentity(selectedEpisode),
    [selectedEpisode],
  );

  const currentEpisodeIndex = useMemo(() => {
    if (!selectedEpisode) return -1;

    const selectedVideoUrl = selectedEpisode.videoUrl?.trim() ?? "";
    const selectedEpisodeNumber =
      typeof selectedEpisode.episodeNumber === "number"
        ? selectedEpisode.episodeNumber
        : -1;

    if (usesSourceSpecificEpisodeIdentity) {
      const byIdentityIndex = episodes.findIndex(
        (episode) => buildEpisodeIdentity(episode) === selectedEpisodeIdentity,
      );
      if (byIdentityIndex >= 0) return byIdentityIndex;

      const byVideoUrlIndex = episodes.findIndex(
        (episode) => (episode.videoUrl?.trim() ?? "") === selectedVideoUrl,
      );
      if (byVideoUrlIndex >= 0) return byVideoUrlIndex;

      const byEpisodeNumberIndex = episodes.findIndex(
        (episode) => episode.episodeNumber === selectedEpisodeNumber,
      );
      if (byEpisodeNumberIndex >= 0) return byEpisodeNumberIndex;
    }

    const byIdIndex = episodes.findIndex(
      (episode) => episode.id === selectedEpisode.id,
    );
    if (byIdIndex >= 0) return byIdIndex;

    const byEpisodeNumberIndex = episodes.findIndex(
      (episode) => episode.episodeNumber === selectedEpisodeNumber,
    );
    if (byEpisodeNumberIndex >= 0) return byEpisodeNumberIndex;

    return -1;
  }, [
    episodes,
    usesSourceSpecificEpisodeIdentity,
    selectedEpisode,
    selectedEpisodeIdentity,
  ]);

  const prevEpisode =
    currentEpisodeIndex > 0 ? episodes[currentEpisodeIndex - 1] : null;

  const nextEpisode =
    currentEpisodeIndex >= 0 && currentEpisodeIndex < episodes.length - 1
      ? episodes[currentEpisodeIndex + 1]
      : null;

  const tryAutoplay = async () => {
    const video = videoRef.current;
    if (!video || !videoSrc) return false;

    try {
      video.muted = false;
      video.defaultMuted = false;
      await video.play();
      setIsMuted(false);
      setIsPlaying(true);
      setVideoError(null);
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return false;
      }

      console.error("Failed to autoplay video:", error);
      setIsPlaying(false);
      setVideoError(
        "Autoplay unmute diblok browser/WebView. Tekan Play untuk mulai.",
      );
      return false;
    } finally {
      pendingAutoplayRef.current = false;
      setShouldAutoplayNext(false);
    }
  };

  const clearOverlayHideTimer = () => {
    if (overlayHideTimerRef.current != null) {
      window.clearTimeout(overlayHideTimerRef.current);
      overlayHideTimerRef.current = null;
    }
  };

  const scheduleOverlayHide = (force = false) => {
    clearOverlayHideTimer();

    if (!videoSrc) {
      setShowFullscreenControls(true);
      return;
    }

    if (!force && !isPlaying) {
      setShowFullscreenControls(true);
      return;
    }

    overlayHideTimerRef.current = window.setTimeout(() => {
      setShowFullscreenControls(false);
    }, 3000);
  };

  const revealFullscreenControls = () => {
    setShowFullscreenControls(true);
    scheduleOverlayHide();
  };

  const goToEpisode = (episode: Episode, autoplay = false) => {
    pendingAutoplayRef.current = autoplay;
    setShouldAutoplayNext(autoplay);
    setVideoError(null);

    revealFullscreenControls();
    onSelectEpisode(episode);
  };

  useEffect(() => {
    let cancelled = false;

    async function resolveReelifeStream() {
      if (!isReelifeDrama) {
        setResolvedReelifeUrl("");
        setIsResolvingReelife(false);
        return;
      }

      if (!rawVideoSrc) {
        setResolvedReelifeUrl("");
        setIsResolvingReelife(false);
        return;
      }

      if (rawVideoSrc.includes("/api/reelife/stream?url=")) {
        setResolvedReelifeUrl(rawVideoSrc);
        setIsResolvingReelife(false);
        setVideoError(null);
        return;
      }

      setIsResolvingReelife(true);
      setResolvedReelifeUrl("");
      setVideoError(null);

      try {
        const response = await fetch(rawVideoSrc, {
          cache: "no-store",
        });

        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("video/")) {
          if (cancelled) return;
          setResolvedReelifeUrl(rawVideoSrc);
          return;
        }

        const json = await response.json();

        if (cancelled) return;

        if (!response.ok || !json?.url) {
          throw new Error(json?.error || "Gagal resolve stream Reelife");
        }

        setResolvedReelifeUrl(json.url);
      } catch (error) {
        if (cancelled) return;

        setResolvedReelifeUrl("");
        setVideoError(
          error instanceof Error
            ? error.message
            : "Gagal resolve stream Reelife",
        );
      } finally {
        if (!cancelled) {
          setIsResolvingReelife(false);
        }
      }
    }

    void resolveReelifeStream();

    return () => {
      cancelled = true;
    };
  }, [isReelifeDrama, rawVideoSrc]);

  useEffect(() => {
    let cancelled = false;

    async function resolveFreeReelsStream() {
      if (!isFreeReelsDrama) {
        setResolvedFreeReelsUrl("");
        setResolvedFreeReelsSubtitleUrl("");
        setIsResolvingFreeReels(false);
        return;
      }

      if (!rawVideoSrc) {
        setResolvedFreeReelsUrl("");
        setResolvedFreeReelsSubtitleUrl("");
        setIsResolvingFreeReels(false);
        return;
      }

      if (rawVideoSrc.includes("/api/freereels/stream?url=")) {
        setResolvedFreeReelsUrl(rawVideoSrc);
        setIsResolvingFreeReels(false);
        setVideoError(null);
        return;
      }

      setIsResolvingFreeReels(true);
      setResolvedFreeReelsUrl("");
      setVideoError(null);

      try {
        const response = await fetch(rawVideoSrc, {
          cache: "no-store",
        });

        const contentType = response.headers.get("content-type") || "";

        if (
          contentType.includes("video/") ||
          contentType.includes("application/vnd.apple.mpegurl")
        ) {
          if (cancelled) return;
          setResolvedFreeReelsUrl(rawVideoSrc);
          return;
        }

        const json = await response.json();

        if (cancelled) return;

        if (!response.ok || !json?.url) {
          throw new Error(json?.error || "Gagal resolve stream FreeReels");
        }

        setResolvedFreeReelsUrl(json.url);
      } catch (error) {
        if (cancelled) return;

        setResolvedFreeReelsUrl("");
        setVideoError(
          error instanceof Error
            ? error.message
            : "Gagal resolve stream FreeReels",
        );
      } finally {
        if (!cancelled) {
          setIsResolvingFreeReels(false);
        }
      }
    }

    void resolveFreeReelsStream();

    return () => {
      cancelled = true;
    };
  }, [isFreeReelsDrama, rawVideoSrc]);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++freeReelsSubtitleRequestIdRef.current;

    async function resolveFreeReelsSubtitle() {
      if (!isFreeReelsDrama) {
        setResolvedFreeReelsSubtitleUrl("");
        return;
      }

      const fallbackSubtitle = selectedEpisode?.subtitleUrl?.trim() || "";
      const dramaId =
        selectedDrama.freereelsDramaId || selectedDrama.freereelsRawId || "";

      const episodeId =
        selectedEpisode?.freereelsPlayId ||
        (typeof selectedEpisode?.episodeNumber === "number"
          ? String(selectedEpisode.episodeNumber)
          : "");

      const code =
        selectedEpisode?.freereelsCode || selectedDrama.freereelsCode || "";

      if (!dramaId || !episodeId) {
        setResolvedFreeReelsSubtitleUrl(fallbackSubtitle);
        return;
      }

      try {
        const response = await fetch(
          `/api/freereels/stream?dramaId=${encodeURIComponent(dramaId)}&episodeId=${encodeURIComponent(episodeId)}&code=${encodeURIComponent(code)}`,
          { cache: "no-store" },
        );

        const json = await response.json().catch(() => null);

        if (cancelled || requestId !== freeReelsSubtitleRequestIdRef.current) {
          return;
        }

        setResolvedFreeReelsSubtitleUrl(
          typeof json?.subtitleUrl === "string" && json.subtitleUrl.trim()
            ? json.subtitleUrl.trim()
            : fallbackSubtitle,
        );
      } catch {
        if (cancelled || requestId !== freeReelsSubtitleRequestIdRef.current) {
          return;
        }
        setResolvedFreeReelsSubtitleUrl(fallbackSubtitle);
      }
    }

    void resolveFreeReelsSubtitle();

    return () => {
      cancelled = true;
    };
  }, [
    isFreeReelsDrama,
    selectedDrama.freereelsDramaId,
    selectedDrama.freereelsRawId,
    selectedDrama.freereelsCode,
    selectedEpisode?.episodeNumber,
    selectedEpisode?.freereelsPlayId,
    selectedEpisode?.freereelsCode,
    selectedEpisode?.subtitleUrl,
  ]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    if (isFullscreen) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [isFullscreen]);

  useEffect(() => {
    setShowFullscreenControls(true);
    scheduleOverlayHide();

    return () => {
      clearOverlayHideTimer();
    };
  }, [currentEpisodeIndex, isPlaying, videoSrc]);

  useEffect(() => {
    setHasPassedAdGate(!shouldGateThisEpisode);
    setAdCountdown(AD_SKIP_DELAY_SECONDS);
    setCanSkipAd(false);
    setProgress(0);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setVideoError(null);

    if (usesSourceSpecificEpisodeIdentity) {
      setNetshortSubtitleCues([]);
      setActiveNetshortSubtitle("");
    }

    if (isFreeReelsDrama) {
      setFreeReelsSubtitleCues([]);
      setActiveFreeReelsSubtitle("");
    }

    if (videoSrc) {
      pendingAutoplayRef.current = true;
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
      videoRef.current.muted = false;
      videoRef.current.defaultMuted = false;
    }

    setIsMuted(false);
  }, [
    usesSourceSpecificEpisodeIdentity,
    selectedEpisode?.id,
    selectedEpisode?.episodeNumber,
    selectedEpisodeIdentity,
    AD_SKIP_DELAY_SECONDS,
  ]);

  useEffect(() => {
    if (hasPassedAdGate) return;
    if (!shouldGateThisEpisode) return;
    if (canSkipAd) return;

    const timer = window.setInterval(() => {
      setAdCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setCanSkipAd(true);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [hasPassedAdGate, shouldGateThisEpisode, canSkipAd]);

  useEffect(() => {
    if (hasPassedAdGate) return;
    if (!shouldGateThisEpisode) return;
    if (isVideoAd) return;

    const timer = window.setTimeout(() => {
      setHasPassedAdGate(true);
    }, AD_TOTAL_DURATION_SECONDS * 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    hasPassedAdGate,
    shouldGateThisEpisode,
    AD_TOTAL_DURATION_SECONDS,
    isVideoAd,
  ]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !videoSrc) return;

    setVideoError(null);
    video.muted = false;
    video.defaultMuted = false;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHlsStream =
      videoSrc.includes(".m3u8") ||
      videoSrc.includes("application/vnd.apple.mpegurl");

    if (!isHlsStream) {
      video.src = videoSrc;
      video.load();
      return;
    }

    video.pause();
    video.removeAttribute("src");
    video.load();

    const canUseNativeHls = !!video.canPlayType(
      "application/vnd.apple.mpegurl",
    );

    if (canUseNativeHls && !isReelShortDrama) {
      video.src = videoSrc;
      video.load();
      return;
    }

    if (!Hls.isSupported()) {
      if (canUseNativeHls) {
        video.src = videoSrc;
        video.load();
        return;
      }

      setVideoError("Browser/WebView ini belum mendukung stream video HLS.");
      return;
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90,
      maxBufferLength: 60,
      maxMaxBufferLength: 120,
      startFragPrefetch: true,
    });

    hlsRef.current = hls;

    const handleManifestParsed = async () => {
      if (shouldAutoplayNext && videoSrc) {
        await tryAutoplay();
      }
    };

    const handleHlsError = (_event: string, data: ErrorData) => {
      const errorInfo = {
        type: data?.type ?? "unknown",
        details: data?.details ?? "unknown",
        fatal: Boolean(data?.fatal),
        reason:
          data?.error instanceof Error
            ? data.error.message
            : typeof data?.error === "string"
              ? data.error
              : "",
      };

      if (errorInfo.fatal) {
        console.error("HLS fatal error:", errorInfo);
      } else {
        console.warn("HLS non-fatal error:", errorInfo);
        return;
      }

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

    hls.on(Hls.Events.MANIFEST_PARSED, handleManifestParsed);
    hls.on(Hls.Events.ERROR, handleHlsError);
    hls.loadSource(videoSrc);
    hls.attachMedia(video);

    return () => {
      hls.off(Hls.Events.MANIFEST_PARSED, handleManifestParsed);
      hls.off(Hls.Events.ERROR, handleHlsError);
      hls.destroy();
      hlsRef.current = null;
    };
  }, [videoSrc, shouldAutoplayNext, isReelShortDrama, hasPassedAdGate]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    if (!hasPassedAdGate && shouldGateThisEpisode) {
      video.pause();
      setIsPlaying(false);
    }
  }, [hasPassedAdGate, shouldGateThisEpisode]);

  useEffect(() => {
    return () => {
      clearOverlayHideTimer();

      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if ((!isNetshortDrama && !isFreeReelsDrama) || !subtitleSrc) {
      setNetshortSubtitleCues([]);
      setActiveNetshortSubtitle("");
      setFreeReelsSubtitleCues([]);
      setActiveFreeReelsSubtitle("");
      return;
    }

    let cancelled = false;

    const loadOverlaySubtitle = async () => {
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

        if (isNetshortDrama) {
          setNetshortSubtitleCues(cues);
          setActiveNetshortSubtitle("");
        }

        if (isFreeReelsDrama) {
          setFreeReelsSubtitleCues(
            mergeFastSubtitleCues(cues, {
              maxGap: 0.28,
              maxDuration: 4.8,
              maxCharsPerLine: 24,
            }),
          );
          setActiveFreeReelsSubtitle("");
        }
      } catch (error) {
        console.error("Gagal memuat subtitle overlay:", error);
        if (!cancelled) {
          if (isNetshortDrama) {
            setNetshortSubtitleCues([]);
            setActiveNetshortSubtitle("");
          }

          if (isFreeReelsDrama) {
            setFreeReelsSubtitleCues([]);
            setActiveFreeReelsSubtitle("");
          }
        }
      }
    };

    void loadOverlaySubtitle();

    return () => {
      cancelled = true;
    };
  }, [isNetshortDrama, isFreeReelsDrama, subtitleSrc]);

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

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !isFreeReelsDrama || freeReelsSubtitleCues.length === 0) {
      setActiveFreeReelsSubtitle("");
      return;
    }

    const updateSubtitle = () => {
      const current = video.currentTime;
      const activeCue = freeReelsSubtitleCues.find(
        (cue) => current >= cue.start && current <= cue.end,
      );

      setActiveFreeReelsSubtitle(activeCue?.text || "");
    };

    video.addEventListener("timeupdate", updateSubtitle);
    updateSubtitle();

    return () => {
      video.removeEventListener("timeupdate", updateSubtitle);
    };
  }, [isFreeReelsDrama, freeReelsSubtitleCues]);

  const handleLoadedMetadata = async () => {
    const video = videoRef.current;
    if (!video) return;

    setDuration(video.duration || 0);

    if (
      !isNetshortDrama &&
      !isShortmaxDrama &&
      !isGoodshortDrama &&
      !isIdramaDrama &&
      !isReelifeDrama &&
      !isFreeReelsDrama &&
      subtitleSrc &&
      video.textTracks &&
      video.textTracks.length > 0
    ) {
      for (let i = 0; i < video.textTracks.length; i += 1) {
        video.textTracks[i].mode = i === 0 ? "showing" : "disabled";
      }
    }

    const isHlsStream =
      videoSrc.includes(".m3u8") ||
      videoSrc.includes("application/vnd.apple.mpegurl");

    if (!isHlsStream && pendingAutoplayRef.current && videoSrc) {
      await tryAutoplay();
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isSeekingRef.current) return;

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

    revealFullscreenControls();

    try {
      if (video.paused) {
        await video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("Failed to play video:", error);
      setVideoError(
        "Video tidak didukung penuh oleh browser/WebView. Coba buka langsung.",
      );
      setIsPlaying(false);
    }
  };

  const handleToggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    revealFullscreenControls();

    const nextMuted = !video.muted;
    video.muted = nextMuted;
    video.defaultMuted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleToggleFullscreen = async () => {
    setShowFullscreenControls(true);
    setIsFullscreen((current) => !current);
    scheduleOverlayHide();
  };

  const seekBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    revealFullscreenControls();

    const nextTime = Math.max(
      0,
      Math.min(video.duration || 0, video.currentTime + seconds),
    );

    isSeekingRef.current = true;
    setCurrentTime(nextTime);

    if ((video.duration || 0) > 0) {
      setProgress((nextTime / (video.duration || 1)) * 100);
    }

    video.currentTime = nextTime;

    window.setTimeout(() => {
      isSeekingRef.current = false;
    }, 500);
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setProgress(100);

    if (nextEpisode) {
      goToEpisode(nextEpisode, true);
    }
  };

  const handleVideoError = () => {
    pendingAutoplayRef.current = false;
    setVideoError("Gagal memuat video episode ini.");
    setIsPlaying(false);
    setShouldAutoplayNext(false);
  };

  const handleClickAdCta = () => {
    onClickAdCta?.();

    if (adCampaign?.ctaUrl) {
      window.open(adCampaign.ctaUrl, "_blank", "noopener,noreferrer");
    }
  };

  const renderAdMedia = () => {
    if (hasActiveAdCampaign && isImageAd && adMediaUrl) {
      return (
        <img
          src={adMediaUrl}
          alt={adHeadline}
          className="mt-3 h-[190px] w-full rounded-[16px] object-cover"
        />
      );
    }

    if (hasActiveAdCampaign && isVideoAd) {
      if (adMediaUrl) {
        return (
          <video
            src={adMediaUrl}
            poster={adCampaign?.posterUrl}
            className="mt-3 h-[190px] w-full rounded-[16px] bg-black object-cover"
            playsInline
            muted
            autoPlay
            preload="auto"
            controls={false}
            onError={() => console.error("Video ad gagal dimuat:", adMediaUrl)}
            onEnded={() => {
              onCompleteAd?.();
              setHasPassedAdGate(true);
              pendingAutoplayRef.current = true;
              setShouldAutoplayNext(true);
            }}
          />
        );
      }

      return (
        <div className="mt-3 flex h-[190px] w-full items-center justify-center rounded-[16px] border border-white/10 bg-black/30 text-sm text-[#B8AA8A]">
          Video ad belum tersedia
        </div>
      );
    }

    return (
      <div className="mt-3 flex h-40 w-full items-center justify-center rounded-[16px] border border-dashed border-white/10 bg-white/[0.03] text-sm text-[#B8AA8A]">
        Jeda iklan
      </div>
    );
  };

  if (
    (isLoadingEpisodes && !selectedEpisode) ||
    isResolvingReelife ||
    isResolvingFreeReels
  ) {
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
    <main
      className={`min-h-screen bg-black text-white ${isFullscreen ? "fixed inset-0 z-[120] overflow-hidden" : ""}`}
    >
      {!hasPassedAdGate ? (
        <div className="fixed inset-0 z-[140] bg-transparent" />
      ) : null}
      <div
        className={`mx-auto min-h-screen w-full ${isFullscreen ? "max-w-none px-0 pb-0 pt-0" : "max-w-md px-4 pb-32 pt-20"}`}
      >
        <div
          className={`fixed left-4 top-4 z-30 ${isFullscreen ? "hidden" : ""}`}
        >
          <button
            onClick={onBack}
            className="rounded-[18px] border border-white/10 bg-[#14151C]/90 px-4 py-2.5 text-sm font-medium text-[#E6D3A3] shadow-[0_6px_18px_rgba(0,0,0,0.22)] backdrop-blur"
          >
            ← Kembali
          </button>
        </div>

        <div
          className={`${isFullscreen ? "h-screen w-screen rounded-none border-0 bg-black shadow-none" : "rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#171822_0%,#101117_100%)] shadow-[0_24px_60px_rgba(0,0,0,0.32)]"}`}
        >
          <div
            className={`${isFullscreen ? "flex h-full w-full flex-col p-0" : "p-4"}`}
          >
            <div
              className={`${isFullscreen ? "hidden" : "flex items-start justify-between gap-3"}`}
            >
              <div className="min-w-0">
                <div className="flex items-center">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#B8AA8A]">
                    Sedang memutar
                  </p>

                  <div className="ml-auto inline-flex rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[10px] font-semibold text-[#E6D3A3]">
                    {isVip ? "VIP · Tanpa iklan" : "FREE · Dengan Iklan"}
                  </div>
                </div>

                <h1 className="mt-2 line-clamp-2 text-[22px] font-bold leading-7 text-white">
                  {selectedDrama.title}
                </h1>
                <p className="mt-1 line-clamp-1 text-sm text-[#8F887C]">
                  {selectedEpisode
                    ? selectedEpisode.title
                    : "Episode belum dipilih"}
                </p>
              </div>
            </div>

            <div
              ref={playerContainerRef}
              className={`${isFullscreen ? "relative flex flex-1 items-center justify-center overflow-hidden bg-black" : "mt-4 overflow-hidden rounded-[22px] border border-white/10 bg-black"}`}
            >
              <div
                className={`${isFullscreen ? "relative h-screen max-h-screen aspect-[9/16] bg-black" : "relative aspect-[9/16] w-full bg-black"}`}
                onClick={revealFullscreenControls}
              >
                {!hasPassedAdGate ? (
                  <div className="absolute inset-0 z-[150] bg-black/80 p-4">
                    <div className="flex h-full w-full flex-col rounded-[22px] border border-white/10 bg-[#12131A]/95 px-5 py-5 text-center shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur">
                      <div>
                        <p className="text-base font-semibold text-white">
                          Iklan sedang diputar
                        </p>
                        <p className="mt-2 text-xs text-[#B8AA8A]">
                          Episode {selectedEpisodeNumber}
                        </p>
                      </div>

                      <div className="mt-6 text-center">
                        <p className="mx-auto max-w-[260px] text-sm leading-7 text-[#8F887C]">
                          Member Free hanya bisa menonton episode 1-10.
                          Episode 11 ke atas khusus VIP, dan beberapa episode
                          yang terbuka dapat menampilkan iklan singkat.
                        </p>
                      </div>

                      <div className="mt-6 flex flex-1 items-start">
                        <div className="h-[320px] w-full overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.03]">
                          <div className="flex h-full flex-col p-4 text-left">
                            <p className="text-sm font-semibold text-white">
                              {adHeadline}
                            </p>

                            {adBody ? (
                              <p className="mt-2 text-xs leading-5 text-[#B8AA8A]">
                                {adBody}
                              </p>
                            ) : null}

                            {renderAdMedia()}
                            {adCampaign?.ctaUrl ? (
                              <button
                                onClick={handleClickAdCta}
                                className="mt-3 w-full rounded-[16px] border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-white"
                              >
                                {adCampaign?.ctaLabel || "Lihat Promo"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-[#B8AA8A]">
                          {canSkipAd
                            ? "Anda dapat melewati iklan sekarang."
                            : `Lewati iklan dalam ${Math.max(0, adCountdown)} detik`}
                        </p>

                        <div className="mt-3 h-1.5 w-full rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-[linear-gradient(90deg,#B76E79,#C9A45C,#E6D3A3)] transition-all"
                            style={{
                              width: `${canSkipAd ? 100 : adProgressPercent}%`,
                            }}
                          />
                        </div>

                        {canSkipAd ? (
                          <button
                            onClick={() => {
                              onSkipAd?.();
                              setHasPassedAdGate(true);
                            }}
                            className="mt-5 w-full rounded-[18px] bg-[#E6D3A3] px-4 py-3 text-sm font-semibold text-black"
                          >
                            Lewati Iklan
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
                {!hasPassedAdGate ? null : selectedEpisodeLockedForMembership ? (
                  <div className="flex h-full items-center justify-center px-6 text-center">
                    <div className="w-full max-w-[320px] rounded-[22px] border border-[#C9A45C]/20 bg-[#12131A]/95 px-5 py-6 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#C9A45C]/12 text-2xl text-[#E6D3A3]">
                        🔒
                      </div>
                      <p className="mt-4 text-base font-semibold text-white">
                        Episode VIP Only
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[#8F887C]">
                        Member Free hanya bisa menonton episode 1-{FREE_EPISODE_LIMIT}.
                        Upgrade ke VIP untuk membuka episode ini dan semua episode berikutnya.
                      </p>
                      <div className="mt-5 flex flex-col gap-2">
                        <span className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-[#E6D3A3]">
                          Episode {selectedEpisodeNumber}
                        </span>
                        <button
                          type="button"
                          onClick={onBack}
                          className="rounded-[16px] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-white"
                        >
                          Kembali ke daftar drama
                        </button>
                      </div>
                    </div>
                  </div>
                ) : videoSrc ? (
                  <video
                    key={
                      isFreeReelsDrama
                        ? `${selectedEpisode?.episodeNumber ?? "no-ep"}`
                        : usesSourceSpecificEpisodeIdentity
                          ? `${selectedEpisode?.episodeNumber ?? "no-ep"}-${selectedEpisodeIdentity}`
                          : `${selectedEpisode?.id ?? "no-id"}`
                    }
                    ref={videoRef}
                    controls={false}
                    autoPlay
                    playsInline
                    preload="metadata"
                    crossOrigin="anonymous"
                    className="h-full w-full object-contain bg-black"
                    onClick={revealFullscreenControls}
                    onTouchStart={revealFullscreenControls}
                    onMouseMove={revealFullscreenControls}
                    onLoadedMetadata={handleLoadedMetadata}
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => {
                      setIsPlaying(true);
                      revealFullscreenControls();
                    }}
                    onPause={() => {
                      setIsPlaying(false);
                      setShowFullscreenControls(true);
                    }}
                    onEnded={handleVideoEnded}
                    onError={handleVideoError}
                  >
                    {!isNetshortDrama &&
                    !isShortmaxDrama &&
                    !isGoodshortDrama &&
                    !isIdramaDrama &&
                    !isReelifeDrama &&
                    !isFreeReelsDrama &&
                    subtitleSrc ? (
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

                {isFullscreen ? (
                  <div
                    className={`absolute inset-x-0 top-0 z-20 bg-gradient-to-b from-black/80 via-black/35 to-transparent px-4 pb-10 pt-4 transition-opacity duration-300 ${
                      showFullscreenControls ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={handleToggleFullscreen}
                        className="rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white/85 backdrop-blur"
                      >
                        Tutup FS
                      </button>

                      <div className="min-w-0 flex-1 text-center">
                        <p className="truncate text-xs uppercase tracking-[0.16em] text-[#B8AA8A]">
                          Sedang memutar
                        </p>
                        <p className="truncate text-sm font-semibold text-white">
                          {selectedEpisode
                            ? selectedEpisode.title
                            : selectedDrama.title}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {subtitleSrc ? (
                          <div className="rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white/85 backdrop-blur">
                            CC {subtitleLabel}
                          </div>
                        ) : null}

                        <button
                          onClick={handleToggleMute}
                          className="rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white/85 backdrop-blur"
                        >
                          {isMuted ? "Unmute" : "Mute"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}

                {isNetshortDrama && activeNetshortSubtitle ? (
                  <div className="pointer-events-none absolute left-1/2 top-[72%] z-20 w-[82%] -translate-x-1/2 -translate-y-1/2 text-center">
                    <div className="inline rounded px-3 py-1.5 text-[17px] font-semibold leading-6 text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.95)]">
                      {activeNetshortSubtitle}
                    </div>
                  </div>
                ) : null}

                {isFreeReelsDrama && activeFreeReelsSubtitle ? (
                  <div className="pointer-events-none absolute left-1/2 top-[68%] z-20 w-[78%] -translate-x-1/2 -translate-y-1/2 text-center">
                    <div className="mx-auto line-clamp-2 whitespace-pre-line break-words rounded px-3 py-1.5 text-[16px] font-semibold leading-6 text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.95)]">
                      {activeFreeReelsSubtitle}
                    </div>
                  </div>
                ) : null}

                {isFullscreen && videoSrc ? (
                  <div
                    className={`pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-8 pt-16 transition-opacity duration-300 ${
                      showFullscreenControls ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <div className="pointer-events-auto flex items-center justify-center gap-3">
                      <button
                        onClick={() =>
                          prevEpisode && goToEpisode(prevEpisode, true)
                        }
                        disabled={!prevEpisode}
                        className="rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => seekBy(-10)}
                        className="rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur"
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
                        className="rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur"
                      >
                        +10
                      </button>
                      <button
                        onClick={() =>
                          nextEpisode && goToEpisode(nextEpisode, true)
                        }
                        disabled={!nextEpisode}
                        className="rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}

                {videoSrc ? (
                  <div
                    className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 ${
                      showFullscreenControls ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <button
                        onClick={handlePlayPause}
                        disabled={!videoSrc}
                        className={`pointer-events-auto flex h-[72px] w-[72px] items-center justify-center rounded-full bg-black/40 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-[2px] transition duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${
                          showFullscreenControls
                            ? "scale-100 opacity-100"
                            : "scale-95 opacity-0"
                        }`}
                        aria-label={isPlaying ? "Pause video" : "Play video"}
                      >
                        {isPlaying ? (
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="h-9 w-9 fill-current drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
                          >
                            <rect
                              x="6"
                              y="4.5"
                              width="4.5"
                              height="15"
                              rx="1.2"
                            />
                            <rect
                              x="13.5"
                              y="4.5"
                              width="4.5"
                              height="15"
                              rx="1.2"
                            />
                          </svg>
                        ) : (
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="ml-1 h-10 w-10 fill-current drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]"
                          >
                            <path d="M8 5.5c0-1.1.78-1.55 1.73-1L19 10.1c.95.55.95 1.25 0 1.8l-9.27 5.6C8.78 18.05 8 17.6 8 16.5v-11z" />
                          </svg>
                        )}
                      </button>
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

                <div
                  className={`absolute right-3 top-3 flex items-center gap-2 ${isFullscreen ? "hidden" : ""}`}
                >
                  <button
                    onClick={handleToggleMute}
                    className="rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white/85 backdrop-blur"
                  >
                    {isMuted ? "Unmute" : "Mute"}
                  </button>

                  <button
                    onClick={handleToggleFullscreen}
                    className="rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white/85 backdrop-blur"
                  >
                    {isFullscreen ? "Exit FS" : "Fullscreen"}
                  </button>
                </div>
              </div>
            </div>

            {hasPassedAdGate ? (
              <div className={`${isFullscreen ? "hidden" : "mt-4"}`}>
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

                <div
                  className={`mt-4 flex items-center justify-center gap-3 ${
                    isFullscreen ? "hidden" : ""
                  }`}
                >
                  <button
                    onClick={() =>
                      prevEpisode && goToEpisode(prevEpisode, true)
                    }
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
                    onClick={() =>
                      nextEpisode && goToEpisode(nextEpisode, true)
                    }
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
            ) : null}
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
                    {episodes.map((episode) => {
                      const episodeIdentity = buildEpisodeIdentity(episode);
                      const isActive = usesSourceSpecificEpisodeIdentity
                        ? episodeIdentity === selectedEpisodeIdentity ||
                          (episode.videoUrl?.trim() ?? "") ===
                            (selectedEpisode?.videoUrl?.trim() ?? "")
                        : episode.id === selectedEpisode?.id;
                      const isLockedForMembership = isEpisodeLockedByMembership(
                        episode,
                        membershipStatus,
                      );

                      return (
                        <button
                          key={
                            usesSourceSpecificEpisodeIdentity
                              ? `${episode.episodeNumber}-${episode.videoUrl}-${episode.subtitleUrl ?? ""}`
                              : `${episode.id}-${episode.episodeNumber}`
                          }
                          onClick={() => {
                            goToEpisode(episode, true);
                            onCloseEpisodes();
                          }}
                          className={`rounded-[18px] border px-3 py-3 text-sm font-semibold transition ${
                            isActive
                              ? "border-[#C9A45C]/25 bg-[linear-gradient(135deg,rgba(201,164,92,0.22),rgba(185,138,132,0.12))] text-[#F2E6C9] shadow-[0_8px_20px_rgba(201,164,92,0.12)]"
                              : isLockedForMembership
                                ? "border-[#B76E79]/20 bg-[#171922] text-[#D8A9AE]"
                                : "border-white/8 bg-[#171922] text-[#B8AA8A]"
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-[15px]">
                              {episode.episodeNumber}
                            </span>
                            {isActive ? (
                              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#E6D3A3]">
                                Now
                              </span>
                            ) : isLockedForMembership ? (
                              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D8A9AE]">
                                VIP
                              </span>
                            ) : (
                              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8F887C]">
                                Open
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
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
