"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import HomeScreen from "@/components/HomeScreen";
import SourceScreen from "@/components/SourceScreen";
import PlayerScreen from "@/components/PlayerScreen";
import HistoryScreen from "@/components/HistoryScreen";
import FavoritesScreen from "@/components/FavoritesScreen";
import ProfileScreen from "@/components/ProfileScreen";
import type { Drama } from "@/types/drama";
import type { Episode } from "@/types/episode";
import type { Source } from "@/types/source";
import Image from "next/image";
import PersistentBottomNav from "@/components/PersistentBottomNav";

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        backgroundColor?: string;
        headerColor?: string;
        colorScheme?: "light" | "dark";
        initDataUnsafe?: {
          user?: {
            id?: number;
            first_name?: string;
            last_name?: string;
            username?: string;
          };
        };
        themeParams?: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
      };
    };
  }
}

const isArray = <T,>(value: unknown): value is T[] => Array.isArray(value);

const DRAMABOX_SEARCH_BASE_URL =
  "https://dramabox.sansekai.my.id/api/dramabox/search";

const REELSHORT_HOME_URL = "/api/reelshort/home";
const REELSHORT_FOR_YOU_URL = "/api/reelshort/foryou";
const REELSHORT_TRENDING_URL = "/api/reelshort/trending";
const REELSHORT_SEARCH_BASE_URL = "/api/reelshort/search";
const REELSHORT_ROMANCE_URL = "/api/reelshort/romance";

const MELOLO_HOME_URL = "/api/melolo/home";
const MELOLO_LATEST_URL = "/api/melolo/latest";
const MELOLO_FORYOU_URL = "/api/melolo/foryou";
const MELOLO_TRENDING_URL = "/api/melolo/trending";
const MELOLO_SEARCH_BASE_URL = "/api/melolo/search";
const DRAMAWAVE_HOME_URL = "/api/dramawave/home";
const DRAMAWAVE_FORYOU_URL = "/api/dramawave/foryou";
const DRAMAWAVE_ANIME_URL = "/api/dramawave/anime";
const DRAMAWAVE_RANDOM_URL = "/api/dramawave/random";
const DRAMAWAVE_SEARCH_BASE_URL = "/api/dramawave/search";

type SafeTelegramUser = {
  id: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
};

type HistoryItem = {
  dramaId: number;
  episodeId: number;
};

type DramaBoxTab = "Beranda" | "Terbaru" | "Dubbing" | "Acak";
type ReelShortTab = "Beranda" | "For You" | "Trending" | "Romance";
type MeloloTab = "Beranda" | "Terbaru" | "Trending" | "ForYou";
type DramawaveTab = "Beranda" | "ForYou" | "Anime" | "Acak";
type DefaultSourceTab = DramaBoxTab;
type SourceTab =
  | DramaBoxTab
  | ReelShortTab
  | MeloloTab
  | DramawaveTab
  | DefaultSourceTab;

type ReelShortDramaMeta = {
  reelShortRawId?: string;
  reelShortCode?: string;
  reelShortSlug?: string;
};

type MeloloDramaMeta = {
  meloloRawId?: string;
  meloloDramaId?: string;
};

type DramawaveDramaMeta = {
  dramawaveRawId?: string;
  dramawaveDramaId?: string;
};

function getValidatedTelegramUser(): SafeTelegramUser | null {
  if (typeof window === "undefined") return null;

  const rawUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (!rawUser) return null;

  const userId = rawUser.id;

  if (typeof userId !== "number" || !Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  const username =
    typeof rawUser.username === "string" && rawUser.username.trim().length > 0
      ? rawUser.username.trim()
      : null;

  const firstName =
    typeof rawUser.first_name === "string" &&
    rawUser.first_name.trim().length > 0
      ? rawUser.first_name.trim()
      : null;

  const lastName =
    typeof rawUser.last_name === "string" && rawUser.last_name.trim().length > 0
      ? rawUser.last_name.trim()
      : null;

  return {
    id: userId,
    username,
    firstName,
    lastName,
  };
}

function getTelegramDisplayName(user: SafeTelegramUser): string | null {
  if (user.username) return user.username;

  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || null;
}

function isValidHistoryItem(value: unknown): value is HistoryItem {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as HistoryItem).dramaId === "number" &&
    typeof (value as HistoryItem).episodeId === "number"
  );
}

function isValidFavoriteId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isDramaBoxDrama(drama: Drama | null): boolean {
  return !!drama && drama.sourceId === "1";
}

function isDramaBoxSource(source: Source | null): boolean {
  return !!source && (source.id === "1" || source.slug === "dramabox");
}

function isReelShortDrama(drama: Drama | null): boolean {
  return (
    !!drama && (drama.sourceId === "2" || drama.sourceName === "ReelShort")
  );
}

function isReelShortSource(source: Source | null): boolean {
  return (
    !!source &&
    (source.slug?.toLowerCase() === "reelshort" ||
      source.name?.toLowerCase() === "reelshort")
  );
}

function isMeloloDrama(drama: Drama | null): boolean {
  return (
    !!drama &&
    (drama.sourceName === "Melolo" || drama.source?.toLowerCase() === "melolo")
  );
}

function isMeloloSource(source: Source | null): boolean {
  return (
    !!source &&
    (source.slug?.toLowerCase() === "melolo" ||
      source.name?.toLowerCase() === "melolo")
  );
}


function isDramawaveDrama(drama: Drama | null): boolean {
  return (
    !!drama &&
    (drama.sourceName === "Dramawave" ||
      drama.source?.toLowerCase() === "dramawave")
  );
}

function isDramawaveSource(source: Source | null): boolean {
  return (
    !!source &&
    (source.slug?.toLowerCase() === "dramawave" ||
      source.name?.toLowerCase() === "dramawave")
  );
}

function getDramaBoxTabEndpoint(
  tab: "Beranda" | "Terbaru" | "Dubbing" | "Acak",
): string {
  switch (tab) {
    case "Beranda":
      return "/api/dramabox/home";
    case "Terbaru":
      return "/api/dramabox/latest";
    case "Dubbing":
      return "/api/dramabox/dubbing";
    case "Acak":
      return "/api/dramabox/random";
    default:
      return "/api/dramabox/home";
  }
}

function getDramaBoxSearchEndpoint(query: string): string {
  return `${DRAMABOX_SEARCH_BASE_URL}?query=${encodeURIComponent(query)}`;
}

function getReelShortTabEndpoint(
  tab: "Beranda" | "For You" | "Trending" | "Romance",
): string {
  switch (tab) {
    case "Beranda":
      return REELSHORT_HOME_URL;
    case "For You":
      return REELSHORT_FOR_YOU_URL;
    case "Trending":
      return REELSHORT_TRENDING_URL;
    case "Romance":
      return REELSHORT_ROMANCE_URL;
    default:
      return REELSHORT_HOME_URL;
  }
}

function getReelShortSearchEndpoint(query: string): string {
  return `${REELSHORT_SEARCH_BASE_URL}?query=${encodeURIComponent(query)}`;
}

function getMeloloTabEndpoint(
  tab: "Beranda" | "Terbaru" | "ForYou" | "Trending",
  offset = 0,
): string {
  switch (tab) {
    case "Beranda":
      return `${MELOLO_HOME_URL}?offset=${offset}`;
    case "Terbaru":
      return MELOLO_LATEST_URL;
    case "ForYou":
      return MELOLO_FORYOU_URL;
    case "Trending":
      return MELOLO_TRENDING_URL;
    default:
      return `${MELOLO_HOME_URL}?offset=${offset}`;
  }
}

function getMeloloSearchEndpoint(query: string): string {
  return `${MELOLO_SEARCH_BASE_URL}?query=${encodeURIComponent(query)}`;
}

function getDramawaveTabEndpoint(
  tab: "Beranda" | "ForYou" | "Anime" | "Acak",
): string {
  switch (tab) {
    case "Beranda":
      return DRAMAWAVE_HOME_URL;
    case "ForYou":
      return DRAMAWAVE_FORYOU_URL;
    case "Anime":
      return DRAMAWAVE_ANIME_URL;
    case "Acak":
      return DRAMAWAVE_RANDOM_URL;
    default:
      return DRAMAWAVE_HOME_URL;
  }
}

function getDramawaveSearchEndpoint(query: string): string {
  return `${DRAMAWAVE_SEARCH_BASE_URL}?query=${encodeURIComponent(query)}`;
}

function getFirstLocalEpisode(
  drama: Drama,
  episodes: Episode[],
): Episode | null {
  return episodes.find((episode) => episode.dramaId === drama.id) ?? null;
}

function getFirstDramaBoxEpisode(episodes: Episode[]): Episode | null {
  return episodes.length > 0 ? episodes[0] : null;
}

function getResumeEpisodeFromHistory(
  dramaId: number,
  availableEpisodes: Episode[],
  historyByDramaId: Map<number, HistoryItem>,
): Episode | null {
  const lastHistory = historyByDramaId.get(dramaId);
  if (!lastHistory) return null;

  return (
    availableEpisodes.find((episode) => episode.id === lastHistory.episodeId) ??
    null
  );
}

function getReelShortMeta(drama: Drama | null): ReelShortDramaMeta {
  if (!drama) return {};

  const meta = drama as Drama & ReelShortDramaMeta;

  return {
    reelShortRawId:
      typeof meta.reelShortRawId === "string" ? meta.reelShortRawId.trim() : "",
    reelShortCode:
      typeof meta.reelShortCode === "string" ? meta.reelShortCode.trim() : "",
    reelShortSlug:
      typeof meta.reelShortSlug === "string" ? meta.reelShortSlug.trim() : "",
  };
}

function getMeloloMeta(drama: Drama | null): MeloloDramaMeta {
  if (!drama) return {};

  const meta = drama as Drama & MeloloDramaMeta;

  return {
    meloloRawId:
      typeof meta.meloloRawId === "string" ? meta.meloloRawId.trim() : "",
    meloloDramaId:
      typeof meta.meloloDramaId === "string" ? meta.meloloDramaId.trim() : "",
  };
}

function extractReelShortRawId(drama: Drama | null): string {
  const meta = getReelShortMeta(drama);

  if (meta.reelShortRawId) return meta.reelShortRawId;

  if (meta.reelShortSlug) {
    const match = meta.reelShortSlug.match(/[a-f0-9]{24}/i);
    if (match) return match[0];
  }

  if (typeof drama?.slug === "string" && drama.slug.trim().length > 0) {
    const match = drama.slug.match(/[a-f0-9]{24}/i);
    if (match) return match[0];
  }

  return "";
}

function extractMeloloDramaId(drama: Drama | null): string {
  const meta = getMeloloMeta(drama);

  if (meta.meloloDramaId) return meta.meloloDramaId;
  if (meta.meloloRawId) return meta.meloloRawId;

  return "";
}

function getDramawaveMeta(drama: Drama | null): DramawaveDramaMeta {
  if (!drama) return {};

  const meta = drama as Drama & DramawaveDramaMeta;

  return {
    dramawaveRawId:
      typeof meta.dramawaveRawId === "string"
        ? meta.dramawaveRawId.trim()
        : "",
    dramawaveDramaId:
      typeof meta.dramawaveDramaId === "string"
        ? meta.dramawaveDramaId.trim()
        : "",
  };
}

function extractDramawaveDramaId(drama: Drama | null): string {
  const meta = getDramawaveMeta(drama);

  if (meta.dramawaveDramaId) return meta.dramawaveDramaId;
  if (meta.dramawaveRawId) return meta.dramawaveRawId;

  return "";
}

function createStableNumericId(seed: string, fallback: number): number {
  if (!seed.trim()) return fallback;

  let value = 7;
  for (const ch of seed) {
    value = (value * 31 + ch.charCodeAt(0)) % 2147483647;
  }

  return value > 0 ? value : fallback;
}

export default function Home() {
  const FAVORITES_STORAGE_KEY = "dramalotus.favoriteIds";
  const HISTORY_STORAGE_KEY = "dramalotus.historyItems";
  const MEMBERSHIP_STORAGE_KEY = "dramalotus.membershipStatus";
  const DRAMABOX_CACHE_STORAGE_KEY = "dramalotus.dramaBoxDramaCache";
  const REELSHORT_CACHE_STORAGE_KEY = "dramalotus.reelShortDramaCache";
  const MELOLO_CACHE_STORAGE_KEY = "dramalotus.meloloDramaCache";
  const DRAMAWAVE_CACHE_STORAGE_KEY = "dramalotus.dramawaveDramaCache";

  const [telegramUserName, setTelegramUserName] = useState<string | null>(null);
  const [telegramUserId, setTelegramUserId] = useState<number | null>(null);
  const [isTelegramWebAppReady, setIsTelegramWebAppReady] = useState(false);
  const [isTelegramUserValid, setIsTelegramUserValid] = useState(false);
  const [hasSyncedProfile, setHasSyncedProfile] = useState(false);
  const [hasLoadedServerFavorites, setHasLoadedServerFavorites] =
    useState(false);
  const [hasLoadedServerHistory, setHasLoadedServerHistory] = useState(false);

  const [sources, setSources] = useState<Source[]>([]);
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [dramaBoxEpisodes, setDramaBoxEpisodes] = useState<Episode[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [reelShortEpisodes, setReelShortEpisodes] = useState<Episode[]>([]);
  const [isLoadingReelShortEpisodes, setIsLoadingReelShortEpisodes] =
    useState(false);
  const [reelShortEpisodesError, setReelShortEpisodesError] = useState<
    string | null
  >(null);
  const [meloloEpisodes, setMeloloEpisodes] = useState<Episode[]>([]);
  const [isLoadingMeloloEpisodes, setIsLoadingMeloloEpisodes] = useState(false);
  const [meloloEpisodesError, setMeloloEpisodesError] = useState<string | null>(
    null,
  );

  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "home" | "history" | "favorites" | "profile"
  >("home");
  const [dramaBoxTab, setDramaBoxTab] = useState<DramaBoxTab>("Beranda");
  const [reelShortTab, setReelShortTab] = useState<ReelShortTab>("Beranda");
  const [meloloTab, setMeloloTab] = useState<MeloloTab>("Beranda");
  const [meloloOffset, setMeloloOffset] = useState(0);
  const [defaultSourceTab, setDefaultSourceTab] =
    useState<DefaultSourceTab>("Beranda");

  const [searchQuery, setSearchQuery] = useState("");
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [membershipStatus, setMembershipStatus] = useState<"free" | "vip">(
    "free",
  );
  const [showSplash, setShowSplash] = useState(true);

  const [isLoadingDramaBoxEpisodes, setIsLoadingDramaBoxEpisodes] =
    useState(false);
  const [dramaBoxEpisodesError, setDramaBoxEpisodesError] = useState<
    string | null
  >(null);

  const [liveDramaBoxDramas, setLiveDramaBoxDramas] = useState<Drama[]>([]);
  const [isLoadingDramaBoxFeed, setIsLoadingDramaBoxFeed] = useState(false);
  const [dramaBoxFeedError, setDramaBoxFeedError] = useState<string | null>(
    null,
  );
  const [dramaBoxDramaCache, setDramaBoxDramaCache] = useState<Drama[]>([]);
  const [liveReelShortDramas, setLiveReelShortDramas] = useState<Drama[]>([]);
  const [isLoadingReelShortFeed, setIsLoadingReelShortFeed] = useState(false);
  const [reelShortFeedError, setReelShortFeedError] = useState<string | null>(
    null,
  );
  const [reelShortDramaCache, setReelShortDramaCache] = useState<Drama[]>([]);
  const [liveMeloloDramas, setLiveMeloloDramas] = useState<Drama[]>([]);
  const [isLoadingMeloloFeed, setIsLoadingMeloloFeed] = useState(false);
  const [meloloFeedError, setMeloloFeedError] = useState<string | null>(null);
  const [meloloDramaCache, setMeloloDramaCache] = useState<Drama[]>([]);

  const [dramawaveEpisodes, setDramawaveEpisodes] = useState<Episode[]>([]);
  const [isLoadingDramawaveEpisodes, setIsLoadingDramawaveEpisodes] =
    useState(false);
  const [dramawaveEpisodesError, setDramawaveEpisodesError] = useState<
    string | null
  >(null);
  const [dramawaveTab, setDramawaveTab] = useState<DramawaveTab>("Beranda");
  const [liveDramawaveDramas, setLiveDramawaveDramas] = useState<Drama[]>([]);
  const [isLoadingDramawaveFeed, setIsLoadingDramawaveFeed] = useState(false);
  const [dramawaveFeedError, setDramawaveFeedError] = useState<string | null>(
    null,
  );
  const [dramawaveDramaCache, setDramawaveDramaCache] = useState<Drama[]>([]);

  const canUseTelegramSync = isTelegramWebAppReady && isTelegramUserValid;

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  const historyByDramaId = useMemo(() => {
    const map = new Map<number, HistoryItem>();

    historyItems.forEach((item) => {
      map.set(item.dramaId, item);
    });

    return map;
  }, [historyItems]);

  const activeSourceTab = useMemo<SourceTab>(() => {
    if (isDramaBoxSource(selectedSource)) return dramaBoxTab;
    if (isReelShortSource(selectedSource)) return reelShortTab;
    if (isMeloloSource(selectedSource)) return meloloTab;
    if (isDramawaveSource(selectedSource)) return dramawaveTab;
    return defaultSourceTab;
  }, [
    selectedSource,
    dramaBoxTab,
    reelShortTab,
    meloloTab,
    dramawaveTab,
    defaultSourceTab,
  ]);

  const handleSourceTabChange = useCallback(
    (tab: SourceTab) => {
      if (isDramaBoxSource(selectedSource)) {
        if (
          tab === "Beranda" ||
          tab === "Terbaru" ||
          tab === "Dubbing" ||
          tab === "Acak"
        ) {
          setDramaBoxTab(tab);
        } else {
          setDramaBoxTab("Beranda");
        }
        return;
      }

      if (isReelShortSource(selectedSource)) {
        if (
          tab === "Beranda" ||
          tab === "For You" ||
          tab === "Trending" ||
          tab === "Romance"
        ) {
          setReelShortTab(tab);
        } else {
          setReelShortTab("Beranda");
        }
        return;
      }

      if (isMeloloSource(selectedSource)) {
        if (
          tab === "Beranda" ||
          tab === "Terbaru" ||
          tab === "ForYou" ||
          tab === "Trending"
        ) {
          setMeloloTab(tab);
          setMeloloOffset(0);
        } else {
          setMeloloTab("Beranda");
          setMeloloOffset(0);
        }
        return;
      }

      if (isDramawaveSource(selectedSource)) {
        if (
          tab === "Beranda" ||
          tab === "ForYou" ||
          tab === "Anime" ||
          tab === "Acak"
        ) {
          setDramawaveTab(tab);
        } else {
          setDramawaveTab("Beranda");
        }
        return;
      }

      setDefaultSourceTab("Beranda");
    },
    [selectedSource],
  );

  const selectedDramaEpisodes = selectedDrama
    ? isDramaBoxDrama(selectedDrama)
      ? dramaBoxEpisodes
      : isReelShortDrama(selectedDrama)
        ? reelShortEpisodes
        : isMeloloDrama(selectedDrama)
          ? meloloEpisodes
          : isDramawaveDrama(selectedDrama)
            ? dramawaveEpisodes
            : episodes.filter((episode) => episode.dramaId === selectedDrama.id)
    : [];

  const handleSubmitSearch = useCallback(() => {
    setSubmittedSearchQuery(searchQuery.trim());

    if (isMeloloSource(selectedSource)) {
      setMeloloOffset(0);
    }
  }, [searchQuery, selectedSource]);

  useEffect(() => {
    if (!showSplash) return;

    const timer = setTimeout(
      () => {
        setShowSplash(false);
      },
      membershipStatus === "vip" ? 350 : 650,
    );

    return () => clearTimeout(timer);
  }, [showSplash, membershipStatus]);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    if (!tg) {
      setIsTelegramWebAppReady(false);
      setIsTelegramUserValid(false);
      setTelegramUserId(null);
      setTelegramUserName(null);
      return;
    }

    setIsTelegramWebAppReady(true);
    tg.ready();
    tg.expand();

    const bgColor = tg.themeParams?.bg_color;
    const textColor = tg.themeParams?.text_color;

    if (bgColor) {
      document.documentElement.style.setProperty("--tg-bg", bgColor);
    }

    if (textColor) {
      document.documentElement.style.setProperty("--tg-text", textColor);
    }

    const validatedUser = getValidatedTelegramUser();

    if (!validatedUser) {
      setTelegramUserId(null);
      setTelegramUserName(null);
      setIsTelegramUserValid(false);
      return;
    }

    setTelegramUserId(validatedUser.id);
    setTelegramUserName(getTelegramDisplayName(validatedUser));
    setIsTelegramUserValid(true);
  }, []);

  useEffect(() => {
    if (canUseTelegramSync) return;

    setTelegramUserId(null);
    setTelegramUserName(null);
    setIsTelegramUserValid(false);
    setHasSyncedProfile(false);
    setHasLoadedServerFavorites(false);
    setHasLoadedServerHistory(false);
  }, [canUseTelegramSync]);

  useEffect(() => {
    setHasLoadedServerFavorites(false);
  }, [telegramUserId]);

  useEffect(() => {
    setHasLoadedServerHistory(false);
  }, [telegramUserId]);

  useEffect(() => {
    try {
      const storedFavoriteIds = window.localStorage.getItem(
        FAVORITES_STORAGE_KEY,
      );

      if (storedFavoriteIds) {
        const parsed = JSON.parse(storedFavoriteIds);
        if (Array.isArray(parsed)) {
          setFavoriteIds(parsed.filter(isValidFavoriteId));
        }
      }
    } catch (error) {
      console.error("Gagal membaca favorit:", error);
    }
  }, []);

  useEffect(() => {
    try {
      const storedHistoryItems =
        window.localStorage.getItem(HISTORY_STORAGE_KEY);

      if (storedHistoryItems) {
        const parsed = JSON.parse(storedHistoryItems);
        if (Array.isArray(parsed)) {
          setHistoryItems(parsed.filter(isValidHistoryItem));
        }
      }
    } catch (error) {
      console.error("Gagal membaca riwayat:", error);
    }
  }, []);

  useEffect(() => {
    try {
      const storedDramaBoxCache = window.localStorage.getItem(
        DRAMABOX_CACHE_STORAGE_KEY,
      );

      if (storedDramaBoxCache) {
        const parsed = JSON.parse(storedDramaBoxCache);
        if (Array.isArray(parsed)) {
          setDramaBoxDramaCache(parsed);
        }
      }
    } catch (error) {
      console.error("Gagal membaca cache DramaBox:", error);
    }
  }, []);

  useEffect(() => {
    try {
      const storedReelShortCache = window.localStorage.getItem(
        REELSHORT_CACHE_STORAGE_KEY,
      );

      if (storedReelShortCache) {
        const parsed = JSON.parse(storedReelShortCache);
        if (Array.isArray(parsed)) {
          setReelShortDramaCache(parsed);
        }
      }
    } catch (error) {
      console.error("Gagal membaca cache ReelShort:", error);
    }
  }, []);

  useEffect(() => {
    try {
      const storedMeloloCache = window.localStorage.getItem(
        MELOLO_CACHE_STORAGE_KEY,
      );

      if (storedMeloloCache) {
        const parsed = JSON.parse(storedMeloloCache);
        if (Array.isArray(parsed)) {
          setMeloloDramaCache(parsed);
        }
      }
    } catch (error) {
      console.error("Gagal membaca cache Melolo:", error);
    }
  }, []);

  useEffect(() => {
    try {
      const storedDramawaveCache = window.localStorage.getItem(
        DRAMAWAVE_CACHE_STORAGE_KEY,
      );

      if (storedDramawaveCache) {
        const parsed = JSON.parse(storedDramawaveCache);
        if (Array.isArray(parsed)) {
          setDramawaveDramaCache(parsed);
        }
      }
    } catch (error) {
      console.error("Gagal membaca cache Dramawave:", error);
    }
  }, []);

  useEffect(() => {
    try {
      const storedMembershipStatus = window.localStorage.getItem(
        MEMBERSHIP_STORAGE_KEY,
      );

      if (
        storedMembershipStatus === "free" ||
        storedMembershipStatus === "vip"
      ) {
        setMembershipStatus(storedMembershipStatus);
      }
    } catch (error) {
      console.error("Gagal membaca localStorage:", error);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(favoriteIds),
      );
    } catch (error) {
      console.error("Gagal menyimpan favorit:", error);
    }
  }, [favoriteIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        HISTORY_STORAGE_KEY,
        JSON.stringify(historyItems),
      );
    } catch (error) {
      console.error("Gagal menyimpan riwayat:", error);
    }
  }, [historyItems]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        DRAMABOX_CACHE_STORAGE_KEY,
        JSON.stringify(dramaBoxDramaCache),
      );
    } catch (error) {
      console.error("Gagal menyimpan cache DramaBox:", error);
    }
  }, [dramaBoxDramaCache]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        REELSHORT_CACHE_STORAGE_KEY,
        JSON.stringify(reelShortDramaCache),
      );
    } catch (error) {
      console.error("Gagal menyimpan cache ReelShort:", error);
    }
  }, [reelShortDramaCache]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        MELOLO_CACHE_STORAGE_KEY,
        JSON.stringify(meloloDramaCache),
      );
    } catch (error) {
      console.error("Gagal menyimpan cache Melolo:", error);
    }
  }, [meloloDramaCache]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        DRAMAWAVE_CACHE_STORAGE_KEY,
        JSON.stringify(dramawaveDramaCache),
      );
    } catch (error) {
      console.error("Gagal menyimpan cache Dramawave:", error);
    }
  }, [dramawaveDramaCache]);

  useEffect(() => {
    try {
      window.localStorage.setItem(MEMBERSHIP_STORAGE_KEY, membershipStatus);
    } catch (error) {
      console.error("Gagal menyimpan membership:", error);
    }
  }, [membershipStatus]);

  useEffect(() => {
    setHasSyncedProfile(false);
  }, [telegramUserId]);

  useEffect(() => {
    if (!canUseTelegramSync || !telegramUserId || hasSyncedProfile) return;

    const syncProfile = async () => {
      try {
        const response = await fetch("/api/user-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            telegram_user_id: telegramUserId,
            telegram_username: telegramUserName,
          }),
        });

        if (!response.ok) {
          throw new Error("Gagal sync user profile.");
        }

        setHasSyncedProfile(true);
      } catch (error) {
        console.error("Gagal sync user profile:", error);
      }
    };

    syncProfile();
  }, [canUseTelegramSync, telegramUserId, telegramUserName, hasSyncedProfile]);

  useEffect(() => {
    if (!canUseTelegramSync || !telegramUserId || hasLoadedServerFavorites)
      return;

    let isMounted = true;

    const loadFavoriteDataFromServer = async () => {
      try {
        const response = await fetch(
          `/api/user-favorites?telegram_user_id=${telegramUserId}`,
        );

        if (!response.ok) {
          throw new Error("Gagal memuat favorit dari server.");
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setFavoriteIds(data.filter(isValidFavoriteId));
        }

        setHasLoadedServerFavorites(true);
      } catch (error) {
        console.error("Gagal memuat favorit server:", error);
      }
    };

    loadFavoriteDataFromServer();

    return () => {
      isMounted = false;
    };
  }, [canUseTelegramSync, telegramUserId, hasLoadedServerFavorites]);

  useEffect(() => {
    if (!canUseTelegramSync || !telegramUserId || hasLoadedServerHistory)
      return;

    let isMounted = true;

    const loadHistoryDataFromServer = async () => {
      try {
        const response = await fetch(
          `/api/user-history?telegram_user_id=${telegramUserId}`,
        );

        if (!response.ok) {
          throw new Error("Gagal memuat riwayat dari server.");
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setHistoryItems(data.filter(isValidHistoryItem));
        }

        setHasLoadedServerHistory(true);
      } catch (error) {
        console.error("Gagal memuat riwayat server:", error);
      }
    };

    loadHistoryDataFromServer();

    return () => {
      isMounted = false;
    };
  }, [canUseTelegramSync, telegramUserId, hasLoadedServerHistory]);

  useEffect(() => {
    let isMounted = true;

    const loadInitialSources = async () => {
      try {
        const sourcesRes = await fetch("/api/sources");

        if (!sourcesRes.ok) {
          throw new Error("Gagal memuat data sources.");
        }

        const sourcesData = await sourcesRes.json();

        if (!isArray<Source>(sourcesData)) {
          throw new Error("Format data sources tidak valid.");
        }

        if (!isMounted) return;

        setSources(sourcesData);
        setDataError(null);
      } catch (error) {
        console.error("Gagal memuat sources:", error);

        if (!isMounted) return;

        setSources([]);
        setDataError(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat sources.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    loadInitialSources();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCatalogInBackground = async () => {
      try {
        const [dramasRes, episodesRes] = await Promise.all([
          fetch("/api/dramas"),
          fetch("/api/episodes"),
        ]);

        if (!dramasRes.ok || !episodesRes.ok) {
          throw new Error("Gagal memuat katalog lokal.");
        }

        const [dramasData, episodesData] = await Promise.all([
          dramasRes.json(),
          episodesRes.json(),
        ]);

        if (!isArray<Drama>(dramasData)) {
          throw new Error("Format data dramas tidak valid.");
        }

        if (!isArray<Episode>(episodesData)) {
          throw new Error("Format data episodes tidak valid.");
        }

        if (!isMounted) return;

        setDramas(dramasData);
        setEpisodes(episodesData);
      } catch (error) {
        console.error("Gagal memuat katalog background:", error);

        if (!isMounted) return;

        setDramas([]);
        setEpisodes([]);
      }
    };

    loadCatalogInBackground();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleToggleFavorite = async (dramaId: number) => {
    const isFavorited = favoriteIdSet.has(dramaId);

    setFavoriteIds((currentFavoriteIds) =>
      isFavorited
        ? currentFavoriteIds.filter((id) => id !== dramaId)
        : [...currentFavoriteIds, dramaId],
    );

    if (!canUseTelegramSync || !telegramUserId) return;

    try {
      const response = await fetch("/api/user-favorites", {
        method: isFavorited ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          telegram_user_id: telegramUserId,
          drama_id: dramaId,
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal sinkron favorit ke server.");
      }
    } catch (error) {
      console.error("Gagal sinkron favorit:", error);

      setFavoriteIds((currentFavoriteIds) =>
        isFavorited
          ? currentFavoriteIds.filter((id) => id !== dramaId)
          : [...currentFavoriteIds, dramaId],
      );
    }
  };

  const handleClearFavorites = async () => {
    const favoriteIdsToDelete = [...favoriteIds];
    setFavoriteIds([]);

    if (!canUseTelegramSync || !telegramUserId) return;

    try {
      await Promise.all(
        favoriteIdsToDelete.map((dramaId) =>
          fetch("/api/user-favorites", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              telegram_user_id: telegramUserId,
              drama_id: dramaId,
            }),
          }),
        ),
      );
    } catch (error) {
      console.error("Gagal menghapus semua favorit:", error);
    }
  };

  const handleClearHistory = async () => {
    const historyItemsToDelete = [...historyItems];
    setHistoryItems([]);

    if (!canUseTelegramSync || !telegramUserId) return;

    try {
      await Promise.all(
        historyItemsToDelete.map((item) =>
          fetch("/api/user-history", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              telegram_user_id: telegramUserId,
              drama_id: item.dramaId,
            }),
          }),
        ),
      );
    } catch (error) {
      console.error("Gagal menghapus semua riwayat:", error);
    }
  };

  const handleSaveToHistory = useCallback(
    async (dramaId: number, episodeId: number) => {
      const previousHistoryItems = historyItems;
      const existingHistoryItem = historyByDramaId.get(dramaId);
      if (existingHistoryItem?.episodeId === episodeId) return;

      setHistoryItems((prev) => {
        const otherHistoryItems = prev.filter(
          (item) => item.dramaId !== dramaId,
        );
        return [{ dramaId, episodeId }, ...otherHistoryItems];
      });

      if (!canUseTelegramSync || !telegramUserId) return;

      try {
        const response = await fetch("/api/user-history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            telegram_user_id: telegramUserId,
            drama_id: dramaId,
            episode_id: episodeId,
          }),
        });

        if (!response.ok) {
          throw new Error("Gagal sinkron riwayat ke server.");
        }
      } catch (error) {
        console.error("Gagal sinkron riwayat:", error);
        setHistoryItems(previousHistoryItems);
      }
    },
    [historyItems, historyByDramaId, canUseTelegramSync, telegramUserId],
  );

  const cacheDramaBoxDrama = useCallback((drama: Drama) => {
    if (!isDramaBoxDrama(drama)) return;

    setDramaBoxDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((item) => {
        map.set(item.id, item);
      });

      map.set(drama.id, drama);

      return Array.from(map.values());
    });
  }, []);

  const cacheReelShortDrama = useCallback((drama: Drama) => {
    if (!isReelShortDrama(drama)) return;

    setReelShortDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((item) => {
        map.set(item.id, item);
      });

      map.set(drama.id, drama);

      return Array.from(map.values());
    });
  }, []);

  const cacheMeloloDrama = useCallback((drama: Drama) => {
    if (!isMeloloDrama(drama)) return;

    setMeloloDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((item) => {
        map.set(item.id, item);
      });

      map.set(drama.id, drama);

      return Array.from(map.values());
    });
  }, []);


  const cacheDramawaveDrama = useCallback((drama: Drama) => {
    if (!isDramawaveDrama(drama)) return;

    setDramawaveDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((item) => {
        map.set(item.id, item);
      });

      map.set(drama.id, drama);

      return Array.from(map.values());
    });
  }, []);

  const mergedDramaMap = useMemo(() => {
    const map = new Map<number, Drama>();

    dramas.forEach((drama) => {
      map.set(drama.id, drama);
    });

    dramaBoxDramaCache.forEach((drama) => {
      map.set(drama.id, drama);
    });

    reelShortDramaCache.forEach((drama) => {
      map.set(drama.id, drama);
    });

    meloloDramaCache.forEach((drama) => {
      map.set(drama.id, drama);
    });

    dramawaveDramaCache.forEach((drama) => {
      map.set(drama.id, drama);
    });

    return map;
  }, [
    dramas,
    dramaBoxDramaCache,
    reelShortDramaCache,
    meloloDramaCache,
    dramawaveDramaCache,
  ]);

  const mergedDramas = useMemo(() => {
    return Array.from(mergedDramaMap.values());
  }, [mergedDramaMap]);

  const favoriteDramaList = useMemo(
    () => mergedDramas.filter((drama) => favoriteIdSet.has(drama.id)),
    [mergedDramas, favoriteIdSet],
  );

  const mostWatchedLabel = useMemo(() => {
    if (historyItems.length === 0) return "-";

    const dramaMap = new Map(mergedDramas.map((drama) => [drama.id, drama]));
    const sourceCount = new Map<string, number>();

    historyItems.forEach((item) => {
      const drama = dramaMap.get(item.dramaId);
      if (!drama?.sourceName) return;

      sourceCount.set(
        drama.sourceName,
        (sourceCount.get(drama.sourceName) ?? 0) + 1,
      );
    });

    let topSource = "-";
    let topCount = 0;

    sourceCount.forEach((count, source) => {
      if (count > topCount) {
        topSource = source;
        topCount = count;
      }
    });

    return topSource;
  }, [historyItems, mergedDramas]);

  useEffect(() => {
    if (!selectedDrama) return;

    if (isDramaBoxDrama(selectedDrama)) {
      cacheDramaBoxDrama(selectedDrama);
      return;
    }

    if (isReelShortDrama(selectedDrama)) {
      cacheReelShortDrama(selectedDrama);
      return;
    }

    if (isMeloloDrama(selectedDrama)) {
      cacheMeloloDrama(selectedDrama);
      return;
    }

    if (isDramawaveDrama(selectedDrama)) {
      cacheDramawaveDrama(selectedDrama);
    }
  }, [
    selectedDrama,
    cacheDramaBoxDrama,
    cacheReelShortDrama,
    cacheMeloloDrama,
    cacheDramawaveDrama,
  ]);

  useEffect(() => {
    if (!selectedDrama || !isDramaBoxDrama(selectedDrama)) return;
    if (selectedEpisode) return;
    if (dramaBoxEpisodes.length === 0) return;

    const resumeEpisode = getResumeEpisodeFromHistory(
      selectedDrama.id,
      dramaBoxEpisodes,
      historyByDramaId,
    );

    const fallbackEpisode = getFirstDramaBoxEpisode(dramaBoxEpisodes);
    const targetEpisode = resumeEpisode ?? fallbackEpisode;

    if (!targetEpisode) return;

    setSelectedEpisode(targetEpisode);
    handleSaveToHistory(selectedDrama.id, targetEpisode.id);
  }, [
    selectedDrama,
    selectedEpisode,
    dramaBoxEpisodes,
    historyByDramaId,
    handleSaveToHistory,
  ]);

  useEffect(() => {
    if (!selectedDrama || !isDramaBoxDrama(selectedDrama)) {
      setDramaBoxEpisodes([]);
      setIsLoadingDramaBoxEpisodes(false);
      setDramaBoxEpisodesError(null);
      return;
    }

    let isMounted = true;

    const loadDramaBoxEpisodes = async () => {
      setIsLoadingDramaBoxEpisodes(true);
      setDramaBoxEpisodesError(null);
      setDramaBoxEpisodes([]);
      setSelectedEpisode(null);

      try {
        const response = await fetch(
          `/api/dramabox/episodes?bookId=${selectedDrama.id}`,
        );

        if (!response.ok) {
          throw new Error("Gagal memuat episode DramaBox.");
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setDramaBoxEpisodes(data);

          if (data.length === 0) {
            setDramaBoxEpisodesError("Episode belum tersedia untuk drama ini.");
          }
        } else {
          setDramaBoxEpisodes([]);
          setDramaBoxEpisodesError("Format episode DramaBox tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat episode DramaBox:", error);

        if (isMounted) {
          setDramaBoxEpisodes([]);
          setDramaBoxEpisodesError(
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat memuat episode DramaBox.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingDramaBoxEpisodes(false);
        }
      }
    };

    loadDramaBoxEpisodes();

    return () => {
      isMounted = false;
    };
  }, [selectedDrama]);

  useEffect(() => {
    if (!isDramaBoxSource(selectedSource)) {
      setLiveDramaBoxDramas([]);
      setIsLoadingDramaBoxFeed(false);
      setDramaBoxFeedError(null);
      return;
    }

    let isMounted = true;
    const keyword = submittedSearchQuery.trim();

    const loadDramaBoxFeed = async () => {
      setIsLoadingDramaBoxFeed(true);
      setDramaBoxFeedError(null);
      setLiveDramaBoxDramas([]);

      try {
        const shouldUseSearch = keyword.length > 0;
        const endpoint = shouldUseSearch
          ? getDramaBoxSearchEndpoint(keyword)
          : getDramaBoxTabEndpoint(dramaBoxTab);

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          if (response.status === 429) {
            throw new Error("Terlalu banyak pencarian. Coba tunggu sebentar.");
          }

          throw new Error(
            `Gagal memuat feed DramaBox. endpoint=${endpoint} status=${response.status}`,
          );
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          const normalizedDramas = data.map((item, index) => {
            const rawItem =
              item && typeof item === "object"
                ? (item as Record<string, unknown>)
                : {};

            const pickString = (...keys: string[]): string => {
              for (const key of keys) {
                const value = rawItem[key];
                if (typeof value === "string" && value.trim().length > 0) {
                  return value.trim();
                }
              }
              return "";
            };

            const pickNumber = (...keys: string[]): number => {
              for (const key of keys) {
                const value = rawItem[key];
                if (typeof value === "number" && Number.isFinite(value)) {
                  return value;
                }
                if (typeof value === "string" && value.trim().length > 0) {
                  const parsed = Number(value);
                  if (Number.isFinite(parsed)) {
                    return parsed;
                  }
                }
              }
              return 0;
            };

            const normalizeStringArray = (value: unknown): string[] => {
              if (Array.isArray(value)) {
                return value
                  .filter((entry): entry is string => typeof entry === "string")
                  .map((entry) => entry.trim())
                  .filter(Boolean);
              }

              if (typeof value === "string" && value.trim().length > 0) {
                return value
                  .split(/[|,/]/)
                  .map((entry) => entry.trim())
                  .filter(Boolean);
              }

              return [];
            };

            const normalizedId =
              pickNumber("id", "bookId", "book_id", "dramaId", "drama_id") ||
              Date.now() + index;

            const normalizedTitle =
              pickString(
                "title",
                "name",
                "bookName",
                "book_name",
                "dramaName",
                "drama_name",
              ) || "Tanpa Judul";

            const normalizedCoverImage = pickString(
              "cover",
              "coverWap",
              "coverImage",
              "cover_image",
              "thumbnail",
              "thumb",
              "poster",
              "posterImage",
              "poster_image",
              "image",
              "imageUrl",
              "image_url",
            );

            const normalizedPosterImage =
              pickString(
                "posterImage",
                "poster_image",
                "poster",
                "cover",
                "coverWap",
                "coverImage",
                "cover_image",
                "thumbnail",
                "thumb",
                "image",
                "imageUrl",
                "image_url",
              ) || normalizedCoverImage;

            const normalizedDescription = pickString(
              "introduction",
              "description",
              "summary",
              "intro",
              "synopsis",
            );

            const normalizedTags = Array.from(
              new Set([
                ...normalizeStringArray(rawItem.tagNames),
                ...normalizeStringArray(rawItem.tags),
                ...normalizeStringArray(rawItem.category),
                ...normalizeStringArray(rawItem.genre),
                "Drama",
              ]),
            ).slice(0, 8);

            const normalizedDrama: Drama = {
              id: normalizedId,
              source: "DramaBox",
              sourceId: "1",
              sourceName: "DramaBox",
              title: normalizedTitle,
              episodes: pickNumber(
                "chapterCount",
                "episodes",
                "episodeCount",
                "episode_count",
                "totalEpisodes",
              ),
              badge: "DramaBox",
              tags: normalizedTags,
              posterClass: "from-[#3A102A] via-[#12131A] to-[#090B12]",
              slug:
                pickString("slug", "bookSlug", "book_slug") ||
                `dramabox-${normalizedId}`,
              description: normalizedDescription,
              coverImage: normalizedCoverImage || undefined,
              posterImage: normalizedPosterImage || undefined,
              category: "Drama",
              language: "in",
              country: undefined,
              isNew: false,
              isDubbed: normalizedTitle.toLowerCase().includes("sulih suara"),
              isTrending: false,
              sortOrder:
                typeof rawItem.sort === "number"
                  ? rawItem.sort
                  : typeof rawItem.sort === "string"
                    ? Number(rawItem.sort) || index
                    : index,
              rating: undefined,
              releaseYear: undefined,
            };

            return normalizedDrama;
          });

          setLiveDramaBoxDramas(normalizedDramas);
        } else {
          setLiveDramaBoxDramas([]);
          setDramaBoxFeedError("Format feed DramaBox tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat feed DramaBox:", error);

        if (!isMounted) return;

        setLiveDramaBoxDramas([]);
        setDramaBoxFeedError(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat feed DramaBox.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingDramaBoxFeed(false);
        }
      }
    };

    loadDramaBoxFeed();

    return () => {
      isMounted = false;
    };
  }, [selectedSource, dramaBoxTab, submittedSearchQuery]);

  useEffect(() => {
    if (liveDramaBoxDramas.length === 0) return;

    setDramaBoxDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((drama) => {
        map.set(drama.id, drama);
      });

      liveDramaBoxDramas.forEach((drama) => {
        map.set(drama.id, drama);
      });

      return Array.from(map.values());
    });
  }, [liveDramaBoxDramas]);

  useEffect(() => {
    if (!isReelShortSource(selectedSource)) {
      setLiveReelShortDramas([]);
      setIsLoadingReelShortFeed(false);
      setReelShortFeedError(null);
      return;
    }

    let isMounted = true;
    const keyword = submittedSearchQuery.trim();

    const loadReelShortFeed = async () => {
      setIsLoadingReelShortFeed(true);
      setReelShortFeedError(null);
      setLiveReelShortDramas([]);

      try {
        const shouldUseSearch = keyword.length > 0;
        const endpoint = shouldUseSearch
          ? getReelShortSearchEndpoint(keyword)
          : getReelShortTabEndpoint(reelShortTab);

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Gagal memuat feed ReelShort. endpoint=${endpoint} status=${response.status}`,
          );
        }

        const data = await response.json();

        if (!isMounted) return;

        const rawList = Array.isArray(data)
          ? data
          : Array.isArray((data as { results?: unknown[] })?.results)
            ? (data as { results: unknown[] }).results
            : Array.isArray((data as { books?: unknown[] })?.books)
              ? (data as { books: unknown[] }).books
              : Array.isArray((data as { data?: unknown[] })?.data)
                ? (data as { data: unknown[] }).data
                : Array.isArray((data as { items?: unknown[] })?.items)
                  ? (data as { items: unknown[] }).items
                  : [];

        const normalizedDramas = rawList.map((item, index) => {
          const rawItem =
            item && typeof item === "object"
              ? (item as Record<string, unknown>)
              : {};

          const pickString = (...keys: string[]): string => {
            for (const key of keys) {
              const value = rawItem[key];
              if (typeof value === "string" && value.trim().length > 0) {
                return value.trim();
              }
            }
            return "";
          };

          const pickNumber = (...keys: string[]): number => {
            for (const key of keys) {
              const value = rawItem[key];
              if (typeof value === "number" && Number.isFinite(value)) {
                return value;
              }
              if (typeof value === "string" && value.trim().length > 0) {
                const parsed = Number(value);
                if (Number.isFinite(parsed)) {
                  return parsed;
                }
              }
            }
            return 0;
          };

          const normalizeStringArray = (value: unknown): string[] => {
            if (Array.isArray(value)) {
              return value
                .filter((entry): entry is string => typeof entry === "string")
                .map((entry) => entry.trim())
                .filter(Boolean);
            }

            if (typeof value === "string" && value.trim().length > 0) {
              return value
                .split(/[|,/]/)
                .map((entry) => entry.trim())
                .filter(Boolean);
            }

            return [];
          };

          const reelShortRawId =
            pickString(
              "book_id",
              "bookId",
              "id",
              "_id",
              "seriesId",
              "dramaId",
              "drama_id",
            ) || "";

          const reelShortCode =
            pickString("code", "bookCode", "contentCode", "shareCode") || "";

          const reelShortSlug =
            pickString("slug", "seriesSlug", "bookSlug", "book_slug") ||
            (reelShortRawId ? `reelshort-${reelShortRawId}` : "");

          const fallbackNumericId =
            pickNumber("chapters", "episodeCount", "episodes", "views") ||
            Date.now() + index;

          const normalizedId = createStableNumericId(
            reelShortRawId || reelShortSlug || `reelshort-${index}`,
            fallbackNumericId,
          );

          const normalizedTitle =
            pickString(
              "title",
              "name",
              "bookName",
              "book_name",
              "dramaName",
              "drama_name",
              "seriesName",
            ) || "Tanpa Judul";

          const normalizedCoverImage = pickString(
            "pic",
            "cover",
            "coverWap",
            "coverImage",
            "cover_image",
            "thumbnail",
            "thumb",
            "poster",
            "posterImage",
            "poster_image",
            "image",
            "imageUrl",
            "image_url",
            "verticalImageUrl",
            "landscapeImageUrl",
          );

          const normalizedPosterImage =
            pickString(
              "pic",
              "posterImage",
              "poster_image",
              "poster",
              "cover",
              "coverWap",
              "coverImage",
              "cover_image",
              "thumbnail",
              "thumb",
              "image",
              "imageUrl",
              "image_url",
              "verticalImageUrl",
              "landscapeImageUrl",
            ) || normalizedCoverImage;

          const normalizedDescription = pickString(
            "desc",
            "introduction",
            "description",
            "summary",
            "intro",
            "synopsis",
          );

          const normalizedTags = Array.from(
            new Set([
              ...normalizeStringArray(rawItem.theme),
              ...normalizeStringArray(rawItem.tagNames),
              ...normalizeStringArray(rawItem.tags),
              ...normalizeStringArray(rawItem.category),
              ...normalizeStringArray(rawItem.genre),
              ...(reelShortTab === "Romance" ? ["Romance"] : []),
              "Drama",
            ]),
          ).slice(0, 8);

          const normalizedDrama = {
            id: normalizedId,
            source: "ReelShort",
            sourceId: selectedSource?.id ?? "2",
            sourceName: "ReelShort",
            title: normalizedTitle,
            episodes: pickNumber(
              "chapters",
              "chapterCount",
              "episodes",
              "episodeCount",
              "episode_count",
              "totalEpisodes",
            ),
            badge:
              reelShortTab === "For You"
                ? "For You"
                : reelShortTab === "Trending"
                  ? "Trending"
                  : reelShortTab === "Romance"
                    ? "Romance"
                    : "ReelShort",
            tags: normalizedTags,
            posterClass: "from-[#1A102E] via-[#12131A] to-[#090B12]",
            slug: reelShortSlug || `reelshort-${normalizedId}`,
            description: normalizedDescription,
            coverImage: normalizedCoverImage || undefined,
            posterImage: normalizedPosterImage || undefined,
            category: reelShortTab === "Romance" ? "Romance" : "Drama",
            language: pickString("lang") || "in",
            country: undefined,
            isNew: reelShortTab === "Beranda",
            isDubbed: normalizedTitle.toLowerCase().includes("versi dub"),
            isTrending: reelShortTab === "Trending",
            sortOrder: index,
            rating: undefined,
            releaseYear: undefined,
            reelShortRawId: reelShortRawId || undefined,
            reelShortCode: reelShortCode || undefined,
            reelShortSlug: reelShortSlug || undefined,
          } as Drama & ReelShortDramaMeta;

          return normalizedDrama as Drama;
        });

        setLiveReelShortDramas(normalizedDramas);
      } catch (error) {
        console.error("Gagal memuat feed ReelShort:", error);

        if (!isMounted) return;

        setLiveReelShortDramas([]);
        setReelShortFeedError(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat feed ReelShort.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingReelShortFeed(false);
        }
      }
    };

    loadReelShortFeed();

    return () => {
      isMounted = false;
    };
  }, [selectedSource, reelShortTab, submittedSearchQuery]);

  useEffect(() => {
    if (liveReelShortDramas.length === 0) return;

    setReelShortDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((drama) => {
        map.set(drama.id, drama);
      });

      liveReelShortDramas.forEach((drama) => {
        map.set(drama.id, drama);
      });

      return Array.from(map.values());
    });
  }, [liveReelShortDramas]);

  useEffect(() => {
    if (!isMeloloSource(selectedSource)) {
      setLiveMeloloDramas([]);
      setIsLoadingMeloloFeed(false);
      setMeloloFeedError(null);
      return;
    }

    let isMounted = true;
    const keyword = submittedSearchQuery.trim();

    const loadMeloloFeed = async () => {
      setIsLoadingMeloloFeed(true);
      setMeloloFeedError(null);
      setLiveMeloloDramas([]);

      try {
        const shouldUseSearch = keyword.length > 0;
        const endpoint = shouldUseSearch
          ? getMeloloSearchEndpoint(keyword)
          : getMeloloTabEndpoint(meloloTab, meloloOffset);

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Gagal memuat feed Melolo. endpoint=${endpoint} status=${response.status}`,
          );
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setLiveMeloloDramas(data as Drama[]);
        } else {
          setLiveMeloloDramas([]);
          setMeloloFeedError("Format feed Melolo tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat feed Melolo:", error);

        if (!isMounted) return;

        setLiveMeloloDramas([]);
        setMeloloFeedError(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat feed Melolo.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingMeloloFeed(false);
        }
      }
    };

    loadMeloloFeed();

    return () => {
      isMounted = false;
    };
  }, [selectedSource, meloloTab, meloloOffset, submittedSearchQuery]);

  useEffect(() => {
    if (liveMeloloDramas.length === 0) return;

    setMeloloDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((drama) => {
        map.set(drama.id, drama);
      });

      liveMeloloDramas.forEach((drama) => {
        map.set(drama.id, drama);
      });

      return Array.from(map.values());
    });
  }, [liveMeloloDramas]);


  useEffect(() => {
    if (!isDramawaveSource(selectedSource)) {
      setLiveDramawaveDramas([]);
      setIsLoadingDramawaveFeed(false);
      setDramawaveFeedError(null);
      return;
    }

    let isMounted = true;
    const keyword = submittedSearchQuery.trim();

    const loadDramawaveFeed = async () => {
      setIsLoadingDramawaveFeed(true);
      setDramawaveFeedError(null);
      setLiveDramawaveDramas([]);

      try {
        const shouldUseSearch = keyword.length > 0;
        const endpoint = shouldUseSearch
          ? getDramawaveSearchEndpoint(keyword)
          : getDramawaveTabEndpoint(dramawaveTab);

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Gagal memuat feed Dramawave. endpoint=${endpoint} status=${response.status}`,
          );
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setLiveDramawaveDramas(data as Drama[]);
        } else {
          setLiveDramawaveDramas([]);
          setDramawaveFeedError("Format feed Dramawave tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat feed Dramawave:", error);

        if (!isMounted) return;

        setLiveDramawaveDramas([]);
        setDramawaveFeedError(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat feed Dramawave.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingDramawaveFeed(false);
        }
      }
    };

    loadDramawaveFeed();

    return () => {
      isMounted = false;
    };
  }, [selectedSource, dramawaveTab, submittedSearchQuery]);

  useEffect(() => {
    if (liveDramawaveDramas.length === 0) return;

    setDramawaveDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((drama) => {
        map.set(drama.id, drama);
      });

      liveDramawaveDramas.forEach((drama) => {
        map.set(drama.id, drama);
      });

      return Array.from(map.values());
    });
  }, [liveDramawaveDramas]);

  useEffect(() => {
    if (!selectedDrama || !isDramawaveDrama(selectedDrama)) return;
    if (selectedEpisode) return;
    if (dramawaveEpisodes.length === 0) return;

    const resumeEpisode = getResumeEpisodeFromHistory(
      selectedDrama.id,
      dramawaveEpisodes,
      historyByDramaId,
    );

    const fallbackEpisode = dramawaveEpisodes[0] ?? null;
    const targetEpisode = resumeEpisode ?? fallbackEpisode;

    if (!targetEpisode) return;

    setSelectedEpisode(targetEpisode);
    handleSaveToHistory(selectedDrama.id, targetEpisode.id);
  }, [
    selectedDrama,
    selectedEpisode,
    dramawaveEpisodes,
    historyByDramaId,
    handleSaveToHistory,
  ]);

  useEffect(() => {
    if (!selectedDrama || !isDramawaveDrama(selectedDrama)) {
      setDramawaveEpisodes([]);
      setIsLoadingDramawaveEpisodes(false);
      setDramawaveEpisodesError(null);
      return;
    }

    let isMounted = true;

    const loadDramawaveEpisodes = async () => {
      setIsLoadingDramawaveEpisodes(true);
      setDramawaveEpisodesError(null);
      setDramawaveEpisodes([]);
      setSelectedEpisode(null);

      try {
        const dramawaveDramaId = extractDramawaveDramaId(selectedDrama);

        if (!dramawaveDramaId) {
          throw new Error(
            "ID asli Dramawave tidak ditemukan dari feed. Periksa field playlet_id.",
          );
        }

        const response = await fetch(
          `/api/dramawave/episodes?dramaId=${encodeURIComponent(dramawaveDramaId)}&numericDramaId=${selectedDrama.id}`,
        );

        if (!response.ok) {
          throw new Error("Gagal memuat episode Dramawave.");
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setDramawaveEpisodes(data);

          if (data.length === 0) {
            setDramawaveEpisodesError(
              "Episode belum tersedia untuk drama ini.",
            );
          }
        } else {
          setDramawaveEpisodes([]);
          setDramawaveEpisodesError("Format episode Dramawave tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat episode Dramawave:", error);

        if (isMounted) {
          setDramawaveEpisodes([]);
          setDramawaveEpisodesError(
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat memuat episode Dramawave.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingDramawaveEpisodes(false);
        }
      }
    };

    loadDramawaveEpisodes();

    return () => {
      isMounted = false;
    };
  }, [selectedDrama]);

  useEffect(() => {
    if (!selectedDrama || !isReelShortDrama(selectedDrama)) return;
    if (selectedEpisode) return;
    if (reelShortEpisodes.length === 0) return;

    const resumeEpisode = getResumeEpisodeFromHistory(
      selectedDrama.id,
      reelShortEpisodes,
      historyByDramaId,
    );

    const fallbackEpisode = reelShortEpisodes[0] ?? null;
    const targetEpisode = resumeEpisode ?? fallbackEpisode;

    if (!targetEpisode) return;

    setSelectedEpisode(targetEpisode);
    handleSaveToHistory(selectedDrama.id, targetEpisode.id);
  }, [
    selectedDrama,
    selectedEpisode,
    reelShortEpisodes,
    historyByDramaId,
    handleSaveToHistory,
  ]);

  useEffect(() => {
    if (!selectedDrama || !isReelShortDrama(selectedDrama)) {
      setReelShortEpisodes([]);
      setIsLoadingReelShortEpisodes(false);
      setReelShortEpisodesError(null);
      return;
    }

    let isMounted = true;

    const loadReelShortEpisodes = async () => {
      setIsLoadingReelShortEpisodes(true);
      setReelShortEpisodesError(null);
      setReelShortEpisodes([]);
      setSelectedEpisode(null);

      try {
        const reelShortRawId = extractReelShortRawId(selectedDrama);
        const { reelShortCode } = getReelShortMeta(selectedDrama);

        if (!reelShortRawId) {
          throw new Error(
            "ID asli ReelShort tidak ditemukan dari feed. Periksa field book_id.",
          );
        }

        const response = await fetch(
          `/api/reelshort/episodes?id=${encodeURIComponent(reelShortRawId)}&code=${encodeURIComponent(reelShortCode || "")}&dramaId=${selectedDrama.id}`,
        );

        if (!response.ok) {
          throw new Error("Gagal memuat episode ReelShort.");
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setReelShortEpisodes(data);

          if (data.length === 0) {
            setReelShortEpisodesError(
              "Episode belum tersedia untuk drama ini.",
            );
          }
        } else {
          setReelShortEpisodes([]);
          setReelShortEpisodesError("Format episode ReelShort tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat episode ReelShort:", error);

        if (isMounted) {
          setReelShortEpisodes([]);
          setReelShortEpisodesError(
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat memuat episode ReelShort.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingReelShortEpisodes(false);
        }
      }
    };

    loadReelShortEpisodes();

    return () => {
      isMounted = false;
    };
  }, [selectedDrama]);

  useEffect(() => {
    if (!selectedDrama || !isMeloloDrama(selectedDrama)) return;
    if (selectedEpisode) return;
    if (meloloEpisodes.length === 0) return;

    const resumeEpisode = getResumeEpisodeFromHistory(
      selectedDrama.id,
      meloloEpisodes,
      historyByDramaId,
    );

    const fallbackEpisode = meloloEpisodes[0] ?? null;
    const targetEpisode = resumeEpisode ?? fallbackEpisode;

    if (!targetEpisode) return;

    setSelectedEpisode(targetEpisode);
    handleSaveToHistory(selectedDrama.id, targetEpisode.id);
  }, [
    selectedDrama,
    selectedEpisode,
    meloloEpisodes,
    historyByDramaId,
    handleSaveToHistory,
  ]);

  useEffect(() => {
    if (!selectedDrama || !isMeloloDrama(selectedDrama)) {
      setMeloloEpisodes([]);
      setIsLoadingMeloloEpisodes(false);
      setMeloloEpisodesError(null);
      return;
    }

    let isMounted = true;

    const loadMeloloEpisodes = async () => {
      setIsLoadingMeloloEpisodes(true);
      setMeloloEpisodesError(null);
      setMeloloEpisodes([]);
      setSelectedEpisode(null);

      try {
        const meloloDramaId = extractMeloloDramaId(selectedDrama);

        if (!meloloDramaId) {
          throw new Error(
            "ID asli Melolo tidak ditemukan dari feed. Periksa field id/book_id.",
          );
        }

        const response = await fetch(
          `/api/melolo/episodes?dramaId=${encodeURIComponent(meloloDramaId)}`,
        );

        if (!response.ok) {
          throw new Error("Gagal memuat episode Melolo.");
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setMeloloEpisodes(data);

          if (data.length === 0) {
            setMeloloEpisodesError("Episode belum tersedia untuk drama ini.");
          }
        } else {
          setMeloloEpisodes([]);
          setMeloloEpisodesError("Format episode Melolo tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat episode Melolo:", error);

        if (isMounted) {
          setMeloloEpisodes([]);
          setMeloloEpisodesError(
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat memuat episode Melolo.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingMeloloEpisodes(false);
        }
      }
    };

    loadMeloloEpisodes();

    return () => {
      isMounted = false;
    };
  }, [selectedDrama]);

  const popularSources = useMemo(
    () =>
      sources
        .filter((source) => source.isPopular)
        .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)),
    [sources],
  );

  const otherSources = useMemo(
    () =>
      sources
        .filter((source) => !source.isPopular)
        .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)),
    [sources],
  );

  const visibleDramas = useMemo(() => {
    const keyword = searchQuery.toLowerCase().trim();

    const baseFiltered = dramas.filter((drama) => {
      const matchesSource = selectedSource
        ? drama.sourceId === selectedSource.id
        : true;

      const matchesSearch =
        keyword.length === 0 ||
        drama.title.toLowerCase().includes(keyword) ||
        drama.tags.some((tag) => tag.toLowerCase().includes(keyword)) ||
        drama.description?.toLowerCase().includes(keyword);

      return matchesSource && matchesSearch;
    });

    if (defaultSourceTab === "Terbaru") {
      return baseFiltered.filter((drama) => drama.isNew);
    }

    if (defaultSourceTab === "Dubbing") {
      return baseFiltered.filter((drama) => drama.isDubbed);
    }

    if (defaultSourceTab === "Acak") {
      return [...baseFiltered].sort(() => Math.random() - 0.5);
    }

    return [...baseFiltered].sort((a, b) => {
      const aOrder = a.sortOrder ?? 9999;
      const bOrder = b.sortOrder ?? 9999;
      return aOrder - bOrder;
    });
  }, [dramas, selectedSource, searchQuery, defaultSourceTab]);

  const sourceScreenDramas = useMemo(() => {
    if (isDramaBoxSource(selectedSource)) {
      return liveDramaBoxDramas;
    }

    if (isReelShortSource(selectedSource)) {
      return liveReelShortDramas;
    }

    if (isMeloloSource(selectedSource)) {
      return liveMeloloDramas;
    }

    if (isDramawaveSource(selectedSource)) {
      return liveDramawaveDramas;
    }

    return visibleDramas;
  }, [
    selectedSource,
    liveDramaBoxDramas,
    liveReelShortDramas,
    liveMeloloDramas,
    liveDramawaveDramas,
    visibleDramas,
  ]);

  const resetNavigationState = () => {
    setSelectedSource(null);
    setSelectedDrama(null);
    setSelectedEpisode(null);
    setShowEpisodes(false);
    setDramaBoxEpisodes([]);
    setDramaBoxEpisodesError(null);
    setSearchQuery("");
    setSubmittedSearchQuery("");
    setDramaBoxTab("Beranda");
    setReelShortTab("Beranda");
    setMeloloTab("Beranda");
    setMeloloOffset(0);
    setDramawaveTab("Beranda");
    setDefaultSourceTab("Beranda");
    setLiveDramaBoxDramas([]);
    setDramaBoxFeedError(null);
    setLiveReelShortDramas([]);
    setReelShortFeedError(null);
    setLiveMeloloDramas([]);
    setMeloloFeedError(null);
    setLiveDramawaveDramas([]);
    setDramawaveFeedError(null);
    setReelShortEpisodes([]);
    setReelShortEpisodesError(null);
    setIsLoadingReelShortEpisodes(false);
    setMeloloEpisodes([]);
    setMeloloEpisodesError(null);
    setIsLoadingMeloloEpisodes(false);
    setDramawaveEpisodes([]);
    setDramawaveEpisodesError(null);
    setIsLoadingDramawaveEpisodes(false);
  };

  const handleGoHome = () => {
    resetNavigationState();
    setActiveTab("home");
  };

  const handleGoHistory = () => {
    resetNavigationState();
    setActiveTab("history");
  };

  const handleGoFavorites = () => {
    resetNavigationState();
    setActiveTab("favorites");
  };

  const handleGoProfile = () => {
    resetNavigationState();
    setActiveTab("profile");
  };

  const effectiveBottomTab: "home" | "history" | "favorites" | "profile" =
    selectedSource || selectedDrama ? "home" : activeTab;

  if (showSplash) {
    return (
      <main className="min-h-screen tg-safe-bottom bg-[#050507] text-[#F5F1E8]">
        <div className="tg-safe-top mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
          <div className="relative w-full overflow-hidden rounded-[34px] border border-white/10 bg-[#0B0C11] p-8 text-center shadow-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(201,164,92,0.16),transparent_38%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(185,138,132,0.08),transparent_58%)]" />

            <div className="relative">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-[30px] border border-[#C9A45C]/15 bg-[linear-gradient(135deg,rgba(201,164,92,0.08),rgba(185,138,132,0.04))] shadow-[0_0_60px_rgba(201,164,92,0.08)]">
                <Image
                  src="/dramalotus-logo.png"
                  alt="DRAMALOTUS Logo"
                  width={84}
                  height={84}
                  className="h-[84px] w-[84px] object-contain"
                />
              </div>

              <h1 className="font-ExoBold mt-6 text-4xl tracking-[0.02em] text-[#D9B36A]">
                DRAMALOTUS
              </h1>

              <p className="mt-4 text-sm leading-7 text-[#9E978B]">
                {membershipStatus === "vip"
                  ? "Menyiapkan pengalaman menonton premium tanpa iklan."
                  : "Menyiapkan pengalaman menonton dan memuat iklan pengguna Free."}
              </p>

              <div className="mt-8 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-2/3 rounded-full bg-[linear-gradient(90deg,#B98A84,#C9A45C,#E6D3A3)]" />
              </div>

              <button
                onClick={() => setShowSplash(false)}
                className="mt-8 w-full rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm font-medium text-[#DDD4C4] transition hover:bg-white/[0.05]"
              >
                Masuk ke DRAMALOTUS
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (isLoadingData) {
    return (
      <main className="min-h-screen tg-safe-bottom bg-[#050507] text-[#F5F1E8]">
        <div className="tg-safe-top mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
          <div className="rounded-[28px] border border-white/10 bg-[#12131A] px-6 py-5 text-center shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
            <p className="text-sm text-[#8F887C]">Memuat katalog drama...</p>
          </div>
        </div>
      </main>
    );
  }

  if (dataError) {
    return (
      <main className="min-h-screen tg-safe-bottom bg-[#050507] text-[#F5F1E8]">
        <div className="tg-safe-top mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
          <div className="w-full rounded-[28px] border border-white/10 bg-[#12131A] px-6 py-6 text-center shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
            <p className="text-base font-semibold text-white">
              Gagal memuat data
            </p>
            <p className="mt-2 text-sm leading-6 text-[#8F887C]">{dataError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-[#E6D3A3]"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (activeTab === "history" && !selectedSource && !selectedDrama) {
    return (
      <>
        <HistoryScreen
          dramas={mergedDramas}
          episodes={episodes}
          historyItems={historyItems}
          onBack={handleGoHome}
          onOpenFavorites={handleGoFavorites}
          onOpenProfile={handleGoProfile}
          onClearHistory={handleClearHistory}
          onSelectDrama={(drama, episode) => {
            if (isDramaBoxDrama(drama)) {
              cacheDramaBoxDrama(drama);
              setSelectedDrama(drama);
              setDramaBoxEpisodes([]);
              setSelectedEpisode(null);
              setDramaBoxEpisodesError(null);
              setShowEpisodes(false);
              setActiveTab("home");
              return;
            }

            if (isReelShortDrama(drama)) {
              cacheReelShortDrama(drama);
              setSelectedDrama(drama);
              setReelShortEpisodes([]);
              setSelectedEpisode(null);
              setReelShortEpisodesError(null);
              setShowEpisodes(false);
              setActiveTab("home");
              return;
            }

            if (isMeloloDrama(drama)) {
              cacheMeloloDrama(drama);
              setSelectedDrama(drama);
              setMeloloEpisodes([]);
              setSelectedEpisode(null);
              setMeloloEpisodesError(null);
              setShowEpisodes(false);
              setActiveTab("home");
              return;
            }

            if (isDramawaveDrama(drama)) {
              cacheDramawaveDrama(drama);
              setSelectedDrama(drama);
              setDramawaveEpisodes([]);
              setSelectedEpisode(null);
              setDramawaveEpisodesError(null);
              setShowEpisodes(false);
              setActiveTab("home");
              return;
            }

            setSelectedDrama(drama);
            setSelectedEpisode(episode);
            setShowEpisodes(false);
            setActiveTab("home");
          }}
        />
        <PersistentBottomNav
          activeTab={effectiveBottomTab}
          onGoHome={handleGoHome}
          onGoHistory={handleGoHistory}
          onGoFavorites={handleGoFavorites}
          onGoProfile={handleGoProfile}
        />
      </>
    );
  }

  if (activeTab === "favorites" && !selectedSource && !selectedDrama) {
    return (
      <>
        <FavoritesScreen
          favoriteDramas={favoriteDramaList}
          onBack={handleGoHome}
          onOpenHistory={handleGoHistory}
          onOpenProfile={handleGoProfile}
          onClearFavorites={handleClearFavorites}
          onSelectDrama={(drama) => {
            if (isDramaBoxDrama(drama)) {
              cacheDramaBoxDrama(drama);
              setSelectedDrama(drama);
              setDramaBoxEpisodes([]);
              setSelectedEpisode(null);
              setDramaBoxEpisodesError(null);
              setShowEpisodes(false);
              setActiveTab("home");
              return;
            }

            if (isReelShortDrama(drama)) {
              cacheReelShortDrama(drama);
              setSelectedDrama(drama);
              setReelShortEpisodes([]);
              setSelectedEpisode(null);
              setReelShortEpisodesError(null);
              setShowEpisodes(false);
              setActiveTab("home");
              return;
            }

            if (isMeloloDrama(drama)) {
              cacheMeloloDrama(drama);
              setSelectedDrama(drama);
              setMeloloEpisodes([]);
              setSelectedEpisode(null);
              setMeloloEpisodesError(null);
              setShowEpisodes(false);
              setActiveTab("home");
              return;
            }

            if (isDramawaveDrama(drama)) {
              cacheDramawaveDrama(drama);
              setSelectedDrama(drama);
              setDramawaveEpisodes([]);
              setSelectedEpisode(null);
              setDramawaveEpisodesError(null);
              setShowEpisodes(false);
              setActiveTab("home");
              return;
            }

            const localEpisodes = episodes.filter(
              (episode) => episode.dramaId === drama.id,
            );

            const resumeEpisode = getResumeEpisodeFromHistory(
              drama.id,
              localEpisodes,
              historyByDramaId,
            );

            const firstEpisode = getFirstLocalEpisode(drama, episodes);
            const targetEpisode = resumeEpisode ?? firstEpisode;

            setSelectedDrama(drama);
            setSelectedEpisode(targetEpisode);
            setShowEpisodes(false);

            if (targetEpisode) {
              handleSaveToHistory(drama.id, targetEpisode.id);
            }

            setActiveTab("home");
          }}
        />
        <PersistentBottomNav
          activeTab={effectiveBottomTab}
          onGoHome={handleGoHome}
          onGoHistory={handleGoHistory}
          onGoFavorites={handleGoFavorites}
          onGoProfile={handleGoProfile}
        />
      </>
    );
  }

  if (activeTab === "profile" && !selectedSource && !selectedDrama) {
    return (
      <>
        <ProfileScreen
          favoriteCount={favoriteDramaList.length}
          historyCount={historyItems.length}
          mostWatchedLabel={mostWatchedLabel}
          membershipStatus={membershipStatus}
          telegramUserName={telegramUserName}
          telegramUserId={telegramUserId}
          onBack={handleGoHome}
          onOpenHistory={handleGoHistory}
          onOpenFavorites={handleGoFavorites}
          onToggleMembership={() =>
            setMembershipStatus((prev) => (prev === "free" ? "vip" : "free"))
          }
        />
        <PersistentBottomNav
          activeTab={effectiveBottomTab}
          onGoHome={handleGoHome}
          onGoHistory={handleGoHistory}
          onGoFavorites={handleGoFavorites}
          onGoProfile={handleGoProfile}
        />
      </>
    );
  }

  if (selectedDrama) {
    return (
      <>
        <PlayerScreen
          selectedDrama={selectedDrama}
          selectedEpisode={selectedEpisode}
          episodes={selectedDramaEpisodes}
          showEpisodes={showEpisodes}
          membershipStatus={membershipStatus}
          isLoadingEpisodes={
            isDramaBoxDrama(selectedDrama)
              ? isLoadingDramaBoxEpisodes
              : isReelShortDrama(selectedDrama)
                ? isLoadingReelShortEpisodes
                : isMeloloDrama(selectedDrama)
                  ? isLoadingMeloloEpisodes
                  : isDramawaveDrama(selectedDrama)
                    ? isLoadingDramawaveEpisodes
                    : false
          }
          episodesError={
            isDramaBoxDrama(selectedDrama)
              ? dramaBoxEpisodesError
              : isReelShortDrama(selectedDrama)
                ? reelShortEpisodesError
                : isMeloloDrama(selectedDrama)
                  ? meloloEpisodesError
                  : isDramawaveDrama(selectedDrama)
                    ? dramawaveEpisodesError
                    : null
          }
          onBack={() => {
            setSelectedDrama(null);
            setSelectedEpisode(null);
            setShowEpisodes(false);
            setDramaBoxEpisodes([]);
            setDramaBoxEpisodesError(null);
            setReelShortEpisodes([]);
            setReelShortEpisodesError(null);
            setMeloloEpisodes([]);
            setMeloloEpisodesError(null);
            setDramawaveEpisodes([]);
            setDramawaveEpisodesError(null);
          }}
          onOpenEpisodes={() => setShowEpisodes(true)}
          onCloseEpisodes={() => setShowEpisodes(false)}
          onSelectEpisode={(episode) => {
            setSelectedEpisode(episode);

            if (selectedDrama) {
              handleSaveToHistory(selectedDrama.id, episode.id);
            }
          }}
        />
        <PersistentBottomNav
          activeTab={effectiveBottomTab}
          onGoHome={handleGoHome}
          onGoHistory={handleGoHistory}
          onGoFavorites={handleGoFavorites}
          onGoProfile={handleGoProfile}
        />
      </>
    );
  }

  if (selectedSource) {
    return (
      <>
        <SourceScreen
          selectedSource={selectedSource}
          searchQuery={searchQuery}
          sourceTab={activeSourceTab}
          filteredDramas={sourceScreenDramas}
          favoriteIds={favoriteIds}
          isTelegramReady={true}
          isSearchEnabled={
            isDramaBoxSource(selectedSource) ||
            isReelShortSource(selectedSource) ||
            isMeloloSource(selectedSource) ||
            isDramawaveSource(selectedSource)
          }
          meloloOffset={meloloOffset}
          showMeloloPagination={
            isMeloloSource(selectedSource) &&
            meloloTab === "Beranda" &&
            submittedSearchQuery.trim().length === 0
          }
          onMeloloPrevPage={() =>
            setMeloloOffset((prev) => Math.max(0, prev - 1))
          }
          onMeloloNextPage={() => setMeloloOffset((prev) => prev + 1)}
          onBack={() => {
            setSelectedSource(null);
            setSearchQuery("");
            setSubmittedSearchQuery("");
            setDramaBoxTab("Beranda");
            setReelShortTab("Beranda");
            setMeloloTab("Beranda");
            setMeloloOffset(0);
            setDramawaveTab("Beranda");
            setDefaultSourceTab("Beranda");
            setLiveDramaBoxDramas([]);
            setDramaBoxFeedError(null);
            setLiveReelShortDramas([]);
            setReelShortFeedError(null);
            setLiveMeloloDramas([]);
            setMeloloFeedError(null);
            setLiveDramawaveDramas([]);
            setDramawaveFeedError(null);
            setDramaBoxEpisodes([]);
            setDramaBoxEpisodesError(null);
            setReelShortEpisodes([]);
            setReelShortEpisodesError(null);
            setMeloloEpisodes([]);
            setMeloloEpisodesError(null);
            setDramawaveEpisodes([]);
            setDramawaveEpisodesError(null);
            setSelectedEpisode(null);
            setShowEpisodes(false);
          }}
          onSearchChange={setSearchQuery}
          onSubmitSearch={handleSubmitSearch}
          onTabChange={handleSourceTabChange}
          onSelectDrama={(drama) => {
            if (isDramaBoxDrama(drama)) {
              cacheDramaBoxDrama(drama);
              setSelectedDrama(drama);
              setDramaBoxEpisodes([]);
              setSelectedEpisode(null);
              setDramaBoxEpisodesError(null);
              setShowEpisodes(false);
              return;
            }

            if (isReelShortDrama(drama)) {
              cacheReelShortDrama(drama);
              setSelectedDrama(drama);
              setReelShortEpisodes([]);
              setSelectedEpisode(null);
              setReelShortEpisodesError(null);
              setShowEpisodes(false);
              return;
            }

            if (isMeloloDrama(drama)) {
              cacheMeloloDrama(drama);
              setSelectedDrama(drama);
              setMeloloEpisodes([]);
              setSelectedEpisode(null);
              setMeloloEpisodesError(null);
              setShowEpisodes(false);
              return;
            }

            if (isDramawaveDrama(drama)) {
              cacheDramawaveDrama(drama);
              setSelectedDrama(drama);
              setDramawaveEpisodes([]);
              setSelectedEpisode(null);
              setDramawaveEpisodesError(null);
              setShowEpisodes(false);
              return;
            }

            const localEpisodes = episodes.filter(
              (episode) => episode.dramaId === drama.id,
            );

            const resumeEpisode = getResumeEpisodeFromHistory(
              drama.id,
              localEpisodes,
              historyByDramaId,
            );

            const firstEpisode = getFirstLocalEpisode(drama, episodes);
            const targetEpisode = resumeEpisode ?? firstEpisode;

            setSelectedDrama(drama);
            setSelectedEpisode(targetEpisode);

            if (targetEpisode) {
              handleSaveToHistory(drama.id, targetEpisode.id);
            }
          }}
          onToggleFavorite={handleToggleFavorite}
        />
        <PersistentBottomNav
          activeTab={effectiveBottomTab}
          onGoHome={handleGoHome}
          onGoHistory={handleGoHistory}
          onGoFavorites={handleGoFavorites}
          onGoProfile={handleGoProfile}
        />
      </>
    );
  }

  return (
    <>
      <HomeScreen
        popularSources={popularSources}
        otherSources={otherSources}
        onSelectSource={(source) => {
          setSelectedSource(source);
          setSearchQuery("");
          setSubmittedSearchQuery("");
          setDramaBoxTab("Beranda");
          setReelShortTab("Beranda");
          setMeloloTab("Beranda");
          setMeloloOffset(0);
          setDramawaveTab("Beranda");
          setDefaultSourceTab("Beranda");
          setLiveDramaBoxDramas([]);
          setDramaBoxFeedError(null);
          setLiveReelShortDramas([]);
          setReelShortFeedError(null);
          setLiveMeloloDramas([]);
          setMeloloFeedError(null);
          setLiveDramawaveDramas([]);
          setDramawaveFeedError(null);
          setDramaBoxEpisodes([]);
          setDramaBoxEpisodesError(null);
          setReelShortEpisodes([]);
          setReelShortEpisodesError(null);
          setMeloloEpisodes([]);
          setMeloloEpisodesError(null);
          setDramawaveEpisodes([]);
          setDramawaveEpisodesError(null);
          setSelectedEpisode(null);
          setShowEpisodes(false);
        }}
        onOpenHistory={handleGoHistory}
        onOpenFavorites={handleGoFavorites}
        onOpenProfile={handleGoProfile}
      />
      <PersistentBottomNav
        activeTab={effectiveBottomTab}
        onGoHome={handleGoHome}
        onGoHistory={handleGoHistory}
        onGoFavorites={handleGoFavorites}
        onGoProfile={handleGoProfile}
      />
    </>
  );
}
