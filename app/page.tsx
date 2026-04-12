"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { type ResolveAdCampaignResponse } from "@/types/ad";

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
const NETSHORT_HOME_URL = "/api/netshort/home";
const NETSHORT_FORYOU_URL = "/api/netshort/foryou";
const NETSHORT_THEATERS_URL = "/api/netshort/theaters";
const NETSHORT_RANDOM_URL = "/api/netshort/random";
const NETSHORT_SEARCH_BASE_URL = "/api/netshort/search";
const FLICKREELS_HOME_URL = "/api/flickreels/home";
const FLICKREELS_FORYOU_URL = "/api/flickreels/foryou";
const FLICKREELS_TRENDING_URL = "/api/flickreels/trending";
const FLICKREELS_RANDOM_URL = "/api/flickreels/random";
const FLICKREELS_SEARCH_BASE_URL = "/api/flickreels/search";
const SHORTMAX_HOME_URL = "/api/shortmax/home";
const SHORTMAX_LATEST_URL = "/api/shortmax/latest";
const SHORTMAX_TRENDING_URL = "/api/shortmax/trending";
const SHORTMAX_HOT_URL = "/api/shortmax/hot";
const GOODSHORT_HOME_URL = "/api/goodshort/home";
const GOODSHORT_HOT_URL = "/api/goodshort/hot";
const GOODSHORT_POPULAR_URL = "/api/goodshort/popular";
const GOODSHORT_SEARCH_BASE_URL = "/api/goodshort/search";
const IDRAMA_HOME_URL = "/api/idrama/home";
const IDRAMA_POPULAR_URL = "/api/idrama/popular";
const IDRAMA_HOT_URL = "/api/idrama/hot";
const IDRAMA_RANDOM_URL = "/api/idrama/random";
const IDRAMA_SEARCH_BASE_URL = "/api/idrama/search";
const REELIFE_HOME_URL = "/api/reelife/home";
const REELIFE_SEARCH_BASE_URL = "/api/reelife/search";
const REELIFE_TRENDING_URL = "/api/reelife/trending";
const REELIFE_HOT_URL = "/api/reelife/hot";
const REELIFE_RANDOM_URL = "/api/reelife/random";
const FREEREELS_HOME_URL = "/api/freereels/home";
const FREEREELS_POPULAR_URL = "/api/freereels/popular";
const FREEREELS_NEW_URL = "/api/freereels/new";
const FREEREELS_FORYOU_URL = "/api/freereels/foryou";
const FREEREELS_SEARCH_BASE_URL = "/api/freereels/search";

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
type NetshortTab = "Beranda" | "ForYou" | "Teater" | "Acak";
type FlickreelsTab = "Beranda" | "ForYou" | "Trending" | "Acak";
type ShortmaxTab = "Beranda" | "Terbaru" | "Trending" | "Hot";
type GoodshortTab = "Beranda" | "Populer" | "Trending" | "Acak";
type ReelifeTab = "Beranda" | "Trending" | "Hot" | "Acak";
type IdramaTab = "Beranda" | "Populer" | "Hot" | "Acak";
type FreeReelsTab = "Beranda" | "Populer" | "Terbaru" | "ForYou";
type DefaultSourceTab = DramaBoxTab;
type SourceTab =
  | DramaBoxTab
  | ReelShortTab
  | MeloloTab
  | DramawaveTab
  | NetshortTab
  | FlickreelsTab
  | ShortmaxTab
  | GoodshortTab
  | ReelifeTab
  | IdramaTab
  | FreeReelsTab
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

type NetshortDramaMeta = {
  netshortRawId?: string;
  netshortDramaId?: string;
};

type FlickreelsDramaMeta = {
  flickreelsRawId?: string;
  flickreelsDramaId?: string;
};

type ShortmaxDramaMeta = {
  shortmaxRawId?: string;
  shortmaxDramaId?: string;
};

type GoodshortDramaMeta = {
  goodshortRawId?: string;
  goodshortDramaId?: string;
};

type IdramaDramaMeta = {
  idramaRawId?: string;
  idramaDramaId?: string;
  idramaCode?: string;
};

type ReelifeDramaMeta = {
  reelifeRawId?: string;
  reelifeDramaId?: string;
  reelifeCode?: string;
};

type FreeReelsDramaMeta = {
  freereelsRawId?: string;
  freereelsDramaId?: string;
  freereelsCode?: string;
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

function isNetshortDrama(drama: Drama | null): boolean {
  return (
    !!drama &&
    (drama.sourceName === "Netshort" ||
      drama.source?.toLowerCase() === "netshort")
  );
}

function isNetshortSource(source: Source | null): boolean {
  return (
    !!source &&
    (source.slug?.toLowerCase() === "netshort" ||
      source.name?.toLowerCase() === "netshort")
  );
}

function isFlickreelsDrama(drama: Drama | null): boolean {
  return (
    !!drama &&
    (drama.sourceName === "Flickreels" ||
      drama.source?.toLowerCase() === "flickreels")
  );
}

function isFlickreelsSource(source: Source | null): boolean {
  return (
    !!source &&
    (source.slug?.toLowerCase() === "flickreels" ||
      source.name?.toLowerCase() === "flickreels")
  );
}

function isShortmaxDrama(drama: Drama | null): boolean {
  return (
    !!drama &&
    (drama.sourceName === "Shortmax" ||
      drama.source?.toLowerCase() === "shortmax")
  );
}

function isShortmaxSource(source: Source | null): boolean {
  return (
    !!source &&
    (source.slug?.toLowerCase() === "shortmax" ||
      source.name?.toLowerCase() === "shortmax")
  );
}

function isGoodshortDrama(drama: Drama | null): boolean {
  return (
    !!drama &&
    (drama.sourceName === "GoodShort" ||
      drama.source?.toLowerCase() === "goodshort")
  );
}

function isGoodshortSource(source: Source | null): boolean {
  return (
    !!source &&
    (source.slug?.toLowerCase() === "goodshort" ||
      source.name?.toLowerCase() === "goodshort")
  );
}

function isIdramaDrama(drama: Drama | null): boolean {
  return (
    !!drama &&
    (drama.sourceName === "iDrama" || drama.source?.toLowerCase() === "idrama")
  );
}

function isIdramaSource(source: Source | null): boolean {
  return (
    !!source &&
    (source.slug?.toLowerCase() === "idrama" ||
      source.name?.toLowerCase() === "idrama")
  );
}

function isReelifeDrama(drama: Drama | null): boolean {
  return (
    !!drama &&
    (drama.sourceName === "Reelife" ||
      drama.source?.toLowerCase() === "reelife")
  );
}

function isReelifeSource(source: Source | null): boolean {
  return (
    !!source &&
    (source.slug?.toLowerCase() === "reelife" ||
      source.name?.toLowerCase() === "reelife")
  );
}

function isFreeReelsDrama(drama: Drama | null): boolean {
  return (
    !!drama &&
    (drama.sourceName === "FreeReels" ||
      drama.source?.toLowerCase() === "freereels")
  );
}

function isFreeReelsSource(source: Source | null): boolean {
  return (
    !!source &&
    (source.slug?.toLowerCase() === "freereels" ||
      source.name?.toLowerCase() === "freereels")
  );
}

function getDramaBoxTabEndpoint(
  tab: "Beranda" | "Terbaru" | "Dubbing" | "Acak",
  page = 1,
): string {
  switch (tab) {
    case "Beranda":
      return `/api/dramabox/home?page=${page}`;
    case "Terbaru":
      return `/api/dramabox/latest?page=${page}`;
    case "Dubbing":
      return `/api/dramabox/dubbing?page=${page}`;
    case "Acak":
      return `/api/dramabox/random?page=${page}`;
    default:
      return `/api/dramabox/home?page=${page}`;
  }
}

function getDramaBoxSearchEndpoint(query: string): string {
  return `${DRAMABOX_SEARCH_BASE_URL}?query=${encodeURIComponent(query)}`;
}

function getReelShortTabEndpoint(
  tab: "Beranda" | "For You" | "Trending" | "Romance",
  page = 1,
): string {
  switch (tab) {
    case "Beranda":
      return `${REELSHORT_HOME_URL}?page=${page}`;
    case "For You":
      return `${REELSHORT_FOR_YOU_URL}?page=${page}`;
    case "Trending":
      return `${REELSHORT_TRENDING_URL}?page=${page}`;
    case "Romance":
      return `${REELSHORT_ROMANCE_URL}?page=${page}`;
    default:
      return `${REELSHORT_HOME_URL}?page=${page}`;
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
  page = 1,
): string {
  switch (tab) {
    case "Beranda":
      return `${DRAMAWAVE_HOME_URL}?page=${page}`;
    case "ForYou":
      return DRAMAWAVE_FORYOU_URL;
    case "Anime":
      return DRAMAWAVE_ANIME_URL;
    case "Acak":
      return DRAMAWAVE_RANDOM_URL;
    default:
      return `${DRAMAWAVE_HOME_URL}?page=${page}`;
  }
}

function getDramawaveSearchEndpoint(query: string): string {
  return `${DRAMAWAVE_SEARCH_BASE_URL}?query=${encodeURIComponent(query)}`;
}

function getNetshortTabEndpoint(
  tab: "Beranda" | "ForYou" | "Teater" | "Acak",
  page = 1,
): string {
  switch (tab) {
    case "ForYou":
      return NETSHORT_FORYOU_URL;
    case "Teater":
      return NETSHORT_THEATERS_URL;
    case "Acak":
      return NETSHORT_RANDOM_URL;
    case "Beranda":
    default:
      return `${NETSHORT_HOME_URL}?page=${page}`;
  }
}

function getNetshortSearchEndpoint(query: string): string {
  return `${NETSHORT_SEARCH_BASE_URL}?query=${encodeURIComponent(query)}`;
}

function getFlickreelsTabEndpoint(
  tab: "Beranda" | "ForYou" | "Trending" | "Acak",
  page = 1,
): string {
  switch (tab) {
    case "Beranda":
      return `/api/flickreels/home?page=${page}`;
    case "ForYou":
      return "/api/flickreels/foryou";
    case "Trending":
      return "/api/flickreels/trending";
    case "Acak":
      return "/api/flickreels/random";
    default:
      return `/api/flickreels/home?page=${page}`;
  }
}

function getFlickreelsSearchEndpoint(query: string): string {
  return `${FLICKREELS_SEARCH_BASE_URL}?query=${encodeURIComponent(query)}`;
}

function getShortmaxTabEndpoint(
  tab: "Beranda" | "Terbaru" | "Trending" | "Hot",
  page = 1,
): string {
  switch (tab) {
    case "Terbaru":
      return `${SHORTMAX_LATEST_URL}?page=${page}`;
    case "Trending":
      return `${SHORTMAX_TRENDING_URL}?page=${page}`;
    case "Hot":
      return `${SHORTMAX_HOT_URL}?page=${page}`;
    case "Beranda":
    default:
      return `${SHORTMAX_HOME_URL}?page=${page}`;
  }
}

function getGoodshortTabEndpoint(
  tab: "Beranda" | "Populer" | "Trending" | "Acak",
  page = 1,
): string {
  switch (tab) {
    case "Populer":
      return `${GOODSHORT_POPULAR_URL}?page=${page}`;
    case "Trending":
      return GOODSHORT_HOT_URL;
    case "Acak":
      return `${GOODSHORT_HOME_URL}?page=${page}`;
    case "Beranda":
    default:
      return `${GOODSHORT_HOME_URL}?page=${page}`;
  }
}

function getGoodshortSearchEndpoint(query: string): string {
  return `${GOODSHORT_SEARCH_BASE_URL}?query=${encodeURIComponent(query)}`;
}

function getIdramaTabEndpoint(
  tab: "Beranda" | "Populer" | "Hot" | "Acak",
  page = 1,
): string {
  switch (tab) {
    case "Populer":
      return `${IDRAMA_POPULAR_URL}?page=${page}`;
    case "Hot":
      return `${IDRAMA_HOT_URL}?page=${page}`;
    case "Acak":
      return `${IDRAMA_RANDOM_URL}?page=${page}`;
    case "Beranda":
    default:
      return `${IDRAMA_HOME_URL}?page=${page}`;
  }
}

function getIdramaSearchEndpoint(query: string, page = 1): string {
  return `${IDRAMA_SEARCH_BASE_URL}?query=${encodeURIComponent(query)}&page=${page}`;
}

function getReelifeTabEndpoint(
  tab: "Beranda" | "Trending" | "Hot" | "Acak",
  page = 1,
): string {
  switch (tab) {
    case "Trending":
      return `${REELIFE_TRENDING_URL}?page=${page}`;
    case "Hot":
      return `${REELIFE_HOT_URL}?page=${page}`;
    case "Acak":
      return `${REELIFE_RANDOM_URL}?page=${page}`;
    case "Beranda":
    default:
      return `${REELIFE_HOME_URL}?page=${page}`;
  }
}

function getReelifeFeedEndpoint(
  query: string,
  tab: "Beranda" | "Trending" | "Hot" | "Acak",
  page = 1,
): string {
  const keyword = query.trim();
  return keyword.length > 0
    ? `${REELIFE_SEARCH_BASE_URL}?query=${encodeURIComponent(keyword)}&page=${page}`
    : getReelifeTabEndpoint(tab, page);
}

function getFreeReelsTabEndpoint(
  tab: "Beranda" | "Populer" | "Terbaru" | "ForYou",
  page = 1,
): string {
  switch (tab) {
    case "Populer":
      return `${FREEREELS_POPULAR_URL}?page=${page}`;
    case "Terbaru":
      return `${FREEREELS_NEW_URL}?page=${page}`;
    case "ForYou":
      return `${FREEREELS_FORYOU_URL}?page=${page}`;
    case "Beranda":
    default:
      return `${FREEREELS_HOME_URL}?page=${page}`;
  }
}

function getFreeReelsFeedEndpoint(
  query: string,
  tab: "Beranda" | "Populer" | "Terbaru" | "ForYou",
  page = 1,
): string {
  const keyword = query.trim();
  return keyword.length > 0
    ? `${FREEREELS_SEARCH_BASE_URL}?query=${encodeURIComponent(keyword)}&page=${page}`
    : getFreeReelsTabEndpoint(tab, page);
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

function createFreeReelsBootstrapEpisode(drama: Drama): Episode | null {
  const freeReelsDramaId = extractFreeReelsDramaId(drama);
  if (!freeReelsDramaId) return null;

  const { freereelsCode } = getFreeReelsMeta(drama);

  return {
    id: createStableNumericId(`${freeReelsDramaId}:1`, 1),
    dramaId: drama.id,
    episodeNumber: 1,
    title: "Episode 1",
    duration: "",
    slug: `freereels-${freeReelsDramaId}-ep-1`,
    description: "",
    thumbnail: drama.coverImage || drama.posterImage || undefined,
    videoUrl: `/api/freereels/stream?dramaId=${encodeURIComponent(
      freeReelsDramaId,
    )}&episodeId=1&code=${encodeURIComponent(freereelsCode || "")}`,
    originalVideoUrl: "",
    isLocked: false,
    isVipOnly: false,
    sortOrder: 1,
    subtitleUrl: undefined,
    subtitleLang: "id-ID",
    subtitleLabel: "Indonesia",
    freereelsEpisodeId: "1",
    freereelsPlayId: "1",
    freereelsCode: freereelsCode || undefined,
  };
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
    const objectIdMatch = meta.reelShortSlug.match(/[a-f0-9]{24}/i);
    if (objectIdMatch) return objectIdMatch[0];

    const slugIdMatch = meta.reelShortSlug.match(/reelshort-([^/?#]+)/i);
    if (slugIdMatch?.[1]) return slugIdMatch[1];
  }

  if (typeof drama?.slug === "string" && drama.slug.trim().length > 0) {
    const objectIdMatch = drama.slug.match(/[a-f0-9]{24}/i);
    if (objectIdMatch) return objectIdMatch[0];

    const slugIdMatch = drama.slug.match(/reelshort-([^/?#]+)/i);
    if (slugIdMatch?.[1]) return slugIdMatch[1];
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
      typeof meta.dramawaveRawId === "string" ? meta.dramawaveRawId.trim() : "",
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

function getNetshortMeta(drama: Drama | null): NetshortDramaMeta {
  if (!drama) return {};

  const meta = drama as Drama & NetshortDramaMeta;

  return {
    netshortRawId:
      typeof meta.netshortRawId === "string" ? meta.netshortRawId.trim() : "",
    netshortDramaId:
      typeof meta.netshortDramaId === "string"
        ? meta.netshortDramaId.trim()
        : "",
  };
}

function extractNetshortDramaId(drama: Drama | null): string {
  const meta = getNetshortMeta(drama);

  if (meta.netshortDramaId) return meta.netshortDramaId;
  if (meta.netshortRawId) return meta.netshortRawId;

  return "";
}

function getFlickreelsMeta(drama: Drama | null): FlickreelsDramaMeta {
  if (!drama) return {};

  const meta = drama as Drama & FlickreelsDramaMeta;

  return {
    flickreelsRawId:
      typeof meta.flickreelsRawId === "string"
        ? meta.flickreelsRawId.trim()
        : "",
    flickreelsDramaId:
      typeof meta.flickreelsDramaId === "string"
        ? meta.flickreelsDramaId.trim()
        : "",
  };
}

function extractFlickreelsDramaId(drama: Drama | null): string {
  const meta = getFlickreelsMeta(drama);

  if (meta.flickreelsDramaId) return meta.flickreelsDramaId;
  if (meta.flickreelsRawId) return meta.flickreelsRawId;

  return "";
}

function getShortmaxMeta(drama: Drama | null): ShortmaxDramaMeta {
  if (!drama) return {};

  const meta = drama as Drama & ShortmaxDramaMeta;

  return {
    shortmaxRawId:
      typeof meta.shortmaxRawId === "string" ? meta.shortmaxRawId.trim() : "",
    shortmaxDramaId:
      typeof meta.shortmaxDramaId === "string"
        ? meta.shortmaxDramaId.trim()
        : "",
  };
}

function extractShortmaxDramaId(drama: Drama | null): string {
  const meta = getShortmaxMeta(drama);

  if (meta.shortmaxDramaId) return meta.shortmaxDramaId;

  if (typeof drama?.slug === "string" && drama.slug.trim().length > 0) {
    const match = drama.slug.match(/shortmax-(\d+)/i);
    if (match?.[1]) return match[1];
  }

  return "";
}

function getGoodshortMeta(drama: Drama | null): GoodshortDramaMeta {
  if (!drama) return {};

  const meta = drama as Drama & GoodshortDramaMeta;

  return {
    goodshortRawId:
      typeof meta.goodshortRawId === "string" ? meta.goodshortRawId.trim() : "",
    goodshortDramaId:
      typeof meta.goodshortDramaId === "string"
        ? meta.goodshortDramaId.trim()
        : "",
  };
}

function extractGoodshortDramaId(drama: Drama | null): string {
  const meta = getGoodshortMeta(drama);

  if (meta.goodshortDramaId) return meta.goodshortDramaId;
  if (meta.goodshortRawId) return meta.goodshortRawId;

  return "";
}

function getIdramaMeta(drama: Drama | null): IdramaDramaMeta {
  if (!drama) return {};

  const meta = drama as Drama & IdramaDramaMeta;

  return {
    idramaRawId:
      typeof meta.idramaRawId === "string" ? meta.idramaRawId.trim() : "",
    idramaDramaId:
      typeof meta.idramaDramaId === "string" ? meta.idramaDramaId.trim() : "",
    idramaCode:
      typeof meta.idramaCode === "string" ? meta.idramaCode.trim() : "",
  };
}

function extractIdramaDramaId(drama: Drama | null): string {
  const meta = getIdramaMeta(drama);

  if (meta.idramaDramaId) return meta.idramaDramaId;
  if (meta.idramaRawId) return meta.idramaRawId;

  return "";
}

function getReelifeMeta(drama: Drama | null): ReelifeDramaMeta {
  if (!drama) return {};

  const meta = drama as Drama & ReelifeDramaMeta;

  return {
    reelifeRawId:
      typeof meta.reelifeRawId === "string" ? meta.reelifeRawId.trim() : "",
    reelifeDramaId:
      typeof meta.reelifeDramaId === "string" ? meta.reelifeDramaId.trim() : "",
    reelifeCode:
      typeof meta.reelifeCode === "string" ? meta.reelifeCode.trim() : "",
  };
}

function extractReelifeDramaId(drama: Drama | null): string {
  const meta = getReelifeMeta(drama);

  if (meta.reelifeDramaId) return meta.reelifeDramaId;
  if (meta.reelifeRawId) return meta.reelifeRawId;

  return "";
}

function getFreeReelsMeta(drama: Drama | null): FreeReelsDramaMeta {
  if (!drama) return {};

  const meta = drama as Drama & FreeReelsDramaMeta;

  return {
    freereelsRawId:
      typeof meta.freereelsRawId === "string" ? meta.freereelsRawId.trim() : "",
    freereelsDramaId:
      typeof meta.freereelsDramaId === "string"
        ? meta.freereelsDramaId.trim()
        : "",
    freereelsCode:
      typeof meta.freereelsCode === "string" ? meta.freereelsCode.trim() : "",
  };
}

function extractFreeReelsDramaId(drama: Drama | null): string {
  const meta = getFreeReelsMeta(drama);

  if (meta.freereelsDramaId) return meta.freereelsDramaId;
  if (meta.freereelsRawId) return meta.freereelsRawId;

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

function dedupeShortmaxDramas(items: Drama[]): Drama[] {
  const map = new Map<string, Drama>();

  items.forEach((drama) => {
    const meta = drama as Drama & ShortmaxDramaMeta;
    const key =
      (typeof meta.shortmaxDramaId === "string" &&
        meta.shortmaxDramaId.trim()) ||
      (typeof meta.shortmaxRawId === "string" && meta.shortmaxRawId.trim()) ||
      (typeof drama.slug === "string" && drama.slug.trim()) ||
      `${drama.sourceName || drama.source || "shortmax"}::${drama.title}`;

    if (!key) return;
    map.set(key, drama);
  });

  return Array.from(map.values());
}

function dedupeFreeReelsDramas(items: Drama[]): Drama[] {
  const map = new Map<string, Drama>();

  items.forEach((drama) => {
    const meta = drama as Drama & FreeReelsDramaMeta;

    const key =
      (typeof meta.freereelsDramaId === "string" &&
      meta.freereelsDramaId.trim().length > 0
        ? meta.freereelsDramaId.trim()
        : "") ||
      (typeof meta.freereelsRawId === "string" &&
      meta.freereelsRawId.trim().length > 0
        ? meta.freereelsRawId.trim()
        : "") ||
      (typeof drama.slug === "string" && drama.slug.trim().length > 0
        ? drama.slug.trim()
        : "") ||
      `${drama.sourceName || drama.source || "freereels"}::${drama.title}`;

    if (!key) return;
    map.set(key, drama);
  });

  return Array.from(map.values());
}

const ENABLED_HOME_SOURCE_SLUGS = new Set([
  "dramabox",
  "reelshort",
  "melolo",
  "dramawave",
  "netshort",
  "flickreels",
  "shortmax",
  "goodshort",
  "idrama",
  "reelife",
  "freereels",
]);

function isSourceVisibleOnHome(source: Source): boolean {
  const slug = source.slug?.toLowerCase()?.trim() || "";
  const name = source.name?.toLowerCase()?.trim() || "";

  return (
    ENABLED_HOME_SOURCE_SLUGS.has(slug) || ENABLED_HOME_SOURCE_SLUGS.has(name)
  );
}

const EMPTY_RESOLVED_AD_RESPONSE: ResolveAdCampaignResponse = {
  ok: true,
  requestId: "",
  placement: "player_gate_portrait",
  decision: {
    shouldShowAd: false,
    reason: "no_active_campaign",
  },
  campaign: null,
};


type WebMeResponse = {
  ok?: boolean;
  user?: {
    membership_status?: "free" | "vip";
  } | null;
};

async function loadMembershipFromWebSession(): Promise<"free" | "vip"> {
  const response = await fetch("/api/me", {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  if (response.status === 401) {
    return "free";
  }

  if (!response.ok) {
    throw new Error("Gagal memuat membership dari web session.");
  }

  const data = (await response.json()) as WebMeResponse;
  return data?.user?.membership_status === "vip" ? "vip" : "free";
}

export default function Home() {
  const FAVORITES_STORAGE_KEY = "dramalotus.favoriteIds";
  const HISTORY_STORAGE_KEY = "dramalotus.historyItems";
  const DRAMABOX_CACHE_STORAGE_KEY = "dramalotus.dramaBoxDramaCache";
  const REELSHORT_CACHE_STORAGE_KEY = "dramalotus.reelShortDramaCache";
  const MELOLO_CACHE_STORAGE_KEY = "dramalotus.meloloDramaCache";
  const DRAMAWAVE_CACHE_STORAGE_KEY = "dramalotus.dramawaveDramaCache";
  const NETSHORT_CACHE_STORAGE_KEY = "dramalotus.netshortDramaCache";
  const FLICKREELS_CACHE_STORAGE_KEY = "dramalotus.flickreelsDramaCache";
  const SHORTMAX_CACHE_STORAGE_KEY = "dramalotus.shortmaxDramaCache";
  const IDRAMA_CACHE_STORAGE_KEY = "dramalotus.idramaDramaCache";
  const REELIFE_CACHE_STORAGE_KEY = "dramalotus.reelifeDramaCache";
  const FREEREELS_CACHE_STORAGE_KEY = "dramalotus.freeReelsDramaCache";

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
  const [dramaBoxPage, setDramaBoxPage] = useState(1);
  const [reelShortPage, setReelShortPage] = useState(1);
  const [dramawavePage, setDramawavePage] = useState(1);
  const [netshortPage, setNetshortPage] = useState(1);
  const [flickreelsPage, setFlickreelsPage] = useState(1);
  const [shortmaxPage, setShortmaxPage] = useState(1);
  const [shortmaxHasMorePages, setShortmaxHasMorePages] = useState(true);

  const [goodshortPage, setGoodshortPage] = useState(1);
  const [goodshortHasNextPage, setGoodshortHasNextPage] = useState(false);
  const [idramaPage, setIdramaPage] = useState(1);
  const [reelifePage, setReelifePage] = useState(1);
  const [freeReelsPage, setFreeReelsPage] = useState(1);
  const [defaultSourceTab, setDefaultSourceTab] =
    useState<DefaultSourceTab>("Beranda");
  const [shortmaxTab, setShortmaxTab] = useState<ShortmaxTab>("Beranda");
  const [goodshortTab, setGoodshortTab] = useState<GoodshortTab>("Beranda");
  const [idramaTab, setIdramaTab] = useState<IdramaTab>("Beranda");
  const [reelifeTab, setReelifeTab] = useState<ReelifeTab>("Beranda");
  const [freeReelsTab, setFreeReelsTab] = useState<FreeReelsTab>("Beranda");

  const [searchQuery, setSearchQuery] = useState("");
  const [submittedSearchQuery, setSubmittedSearchQuery] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [membershipStatus, setMembershipStatus] = useState<"free" | "vip">(
    "free",
  );
  const [isResolvingMembership, setIsResolvingMembership] = useState(true);
  const [resolvedAdResponse, setResolvedAdResponse] =
    useState<ResolveAdCampaignResponse>(EMPTY_RESOLVED_AD_RESPONSE);

  const trackedImpressionKeyRef = useRef<string>("");

  const isVip = membershipStatus === "vip";
  const hasAdFreeExperience = isVip;
  const shouldShowAds = !hasAdFreeExperience;

  const resolvedAdCampaign = resolvedAdResponse.campaign;
  const applyResolvedAdResponse = (response: ResolveAdCampaignResponse) => {
    setResolvedAdResponse(response);
  };

  const trackAdImpression = async () => {
    if (!resolvedAdResponse.campaign) return;

    try {
      await fetch("/api/ad-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: resolvedAdResponse.requestId,
          campaignId: resolvedAdResponse.campaign.id,
          eventType: "impression",
          dramaId: selectedDrama?.id,
          episodeNumber: selectedEpisode?.episodeNumber,
          placement: "player_gate_portrait",
          membership: membershipStatus,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Gagal track impression:", error);
    }
  };

  const trackAdSkip = async () => {
    if (!resolvedAdResponse.campaign) return;

    try {
      await fetch("/api/ad-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: resolvedAdResponse.requestId,
          campaignId: resolvedAdResponse.campaign.id,
          eventType: "skip",
          dramaId: selectedDrama?.id,
          episodeNumber: selectedEpisode?.episodeNumber,
          placement: "player_gate_portrait",
          membership: membershipStatus,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Gagal track skip:", error);
    }
  };

  const trackAdComplete = async () => {
    if (!resolvedAdResponse.campaign) return;

    try {
      await fetch("/api/ad-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: resolvedAdResponse.requestId,
          campaignId: resolvedAdResponse.campaign.id,
          eventType: "complete",
          dramaId: selectedDrama?.id,
          episodeNumber: selectedEpisode?.episodeNumber,
          placement: "player_gate_portrait",
          membership: membershipStatus,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Gagal track complete:", error);
    }
  };

  const trackAdClick = async () => {
    if (!resolvedAdResponse.campaign) return;

    try {
      await fetch("/api/ad-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requestId: resolvedAdResponse.requestId,
          campaignId: resolvedAdResponse.campaign.id,
          eventType: "click",
          dramaId: selectedDrama?.id,
          episodeNumber: selectedEpisode?.episodeNumber,
          placement: "player_gate_portrait",
          membership: membershipStatus,
          ctaLabel: resolvedAdResponse.campaign.ctaLabel,
          ctaUrl: resolvedAdResponse.campaign.ctaUrl,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Gagal track click:", error);
    }
  };

  useEffect(() => {
    if (!resolvedAdResponse.campaign) return;
    if (!resolvedAdResponse.decision.shouldShowAd) return;
    if (!selectedDrama || !selectedEpisode) return;
    if (membershipStatus !== "free") return;
    if (resolvedAdResponse.requestId === "req_mock_001") return;

    const impressionKey = [
      resolvedAdResponse.requestId,
      resolvedAdResponse.campaign.id,
      selectedDrama.id,
      selectedEpisode.episodeNumber,
      membershipStatus,
    ].join(":");

    if (trackedImpressionKeyRef.current === impressionKey) return;

    trackedImpressionKeyRef.current = impressionKey;
    trackAdImpression();
  }, [
    resolvedAdResponse.requestId,
    resolvedAdResponse.campaign?.id,
    resolvedAdResponse.decision.shouldShowAd,
    selectedDrama?.id,
    selectedEpisode?.episodeNumber,
    membershipStatus,
  ]);

  const buildResolveAdCampaignUrl = () => {
    if (!selectedDrama || !selectedEpisode) return "";

    const mediaType =
      selectedEpisode.episodeNumber % 2 === 0 ? "video" : "image";

    const params = new URLSearchParams({
      dramaId: String(selectedDrama.id),
      episodeNumber: String(selectedEpisode.episodeNumber ?? 0),
      placement: "player_gate_portrait",
      membership: membershipStatus,
      sourceName: selectedDrama.sourceName || selectedDrama.source || "",
      mediaType,
    });

    return `/api/ad-campaigns/resolve?${params.toString()}`;
  };

  useEffect(() => {
    let isMounted = true;

    if (isMounted) {
      applyResolvedAdResponse(EMPTY_RESOLVED_AD_RESPONSE);
    }

    const loadResolvedAdCampaign = async () => {
      const resolveUrl = buildResolveAdCampaignUrl();

      if (!resolveUrl) {
        if (!isMounted) return;
        applyResolvedAdResponse(EMPTY_RESOLVED_AD_RESPONSE);
        return;
      }

      try {
        const response = await fetch(resolveUrl, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Gagal resolve ad campaign.");
        }

        const data = (await response.json()) as ResolveAdCampaignResponse;

        if (!isMounted) return;
        applyResolvedAdResponse(data);
      } catch (error) {
        console.error("Gagal memuat resolved ad campaign:", error);

        if (!isMounted) return;
        applyResolvedAdResponse(EMPTY_RESOLVED_AD_RESPONSE);
      }
    };

    loadResolvedAdCampaign();

    return () => {
      isMounted = false;
    };
  }, [selectedDrama, selectedEpisode, membershipStatus]);

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
  const [dramaBoxHasNextPage, setDramaBoxHasNextPage] = useState(false);
  const [reelShortHasNextPage, setReelShortHasNextPage] = useState(false);
  const [meloloHasNextPage, setMeloloHasNextPage] = useState(false);

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

  const [netshortEpisodes, setNetshortEpisodes] = useState<Episode[]>([]);
  const [isLoadingNetshortEpisodes, setIsLoadingNetshortEpisodes] =
    useState(false);
  const [netshortEpisodesError, setNetshortEpisodesError] = useState<
    string | null
  >(null);
  const [netshortTab, setNetshortTab] = useState<NetshortTab>("Beranda");
  const [liveNetshortDramas, setLiveNetshortDramas] = useState<Drama[]>([]);
  const [isLoadingNetshortFeed, setIsLoadingNetshortFeed] = useState(false);
  const [netshortFeedError, setNetshortFeedError] = useState<string | null>(
    null,
  );
  const [netshortDramaCache, setNetshortDramaCache] = useState<Drama[]>([]);

  const [flickreelsEpisodes, setFlickreelsEpisodes] = useState<Episode[]>([]);
  const [isLoadingFlickreelsEpisodes, setIsLoadingFlickreelsEpisodes] =
    useState(false);
  const [flickreelsEpisodesError, setFlickreelsEpisodesError] = useState<
    string | null
  >(null);
  const [flickreelsTab, setFlickreelsTab] = useState<FlickreelsTab>("Beranda");
  const [liveFlickreelsDramas, setLiveFlickreelsDramas] = useState<Drama[]>([]);
  const [isLoadingFlickreelsFeed, setIsLoadingFlickreelsFeed] = useState(false);
  const [flickreelsFeedError, setFlickreelsFeedError] = useState<string | null>(
    null,
  );
  const [flickreelsDramaCache, setFlickreelsDramaCache] = useState<Drama[]>([]);

  const [shortmaxEpisodes, setShortmaxEpisodes] = useState<Episode[]>([]);
  const [isLoadingShortmaxEpisodes, setIsLoadingShortmaxEpisodes] =
    useState(false);
  const [shortmaxEpisodesError, setShortmaxEpisodesError] = useState<
    string | null
  >(null);
  const [liveShortmaxDramas, setLiveShortmaxDramas] = useState<Drama[]>([]);
  const [isLoadingShortmaxFeed, setIsLoadingShortmaxFeed] = useState(false);
  const [shortmaxFeedError, setShortmaxFeedError] = useState<string | null>(
    null,
  );
  const [shortmaxDramaCache, setShortmaxDramaCache] = useState<Drama[]>([]);
  const [goodshortEpisodes, setGoodshortEpisodes] = useState<Episode[]>([]);
  const [isLoadingGoodshortEpisodes, setIsLoadingGoodshortEpisodes] =
    useState(false);
  const [goodshortEpisodesError, setGoodshortEpisodesError] = useState<
    string | null
  >(null);
  const [liveGoodshortDramas, setLiveGoodshortDramas] = useState<Drama[]>([]);
  const [isLoadingGoodshortFeed, setIsLoadingGoodshortFeed] = useState(false);
  const [goodshortFeedError, setGoodshortFeedError] = useState<string | null>(
    null,
  );
  const [goodshortDramaCache, setGoodshortDramaCache] = useState<Drama[]>([]);
  const [idramaEpisodes, setIdramaEpisodes] = useState<Episode[]>([]);
  const [isLoadingIdramaEpisodes, setIsLoadingIdramaEpisodes] = useState(false);
  const [idramaEpisodesError, setIdramaEpisodesError] = useState<string | null>(
    null,
  );
  const [liveIdramaDramas, setLiveIdramaDramas] = useState<Drama[]>([]);
  const [isLoadingIdramaFeed, setIsLoadingIdramaFeed] = useState(false);
  const [idramaFeedError, setIdramaFeedError] = useState<string | null>(null);
  const [idramaDramaCache, setIdramaDramaCache] = useState<Drama[]>([]);

  const [reelifeEpisodes, setReelifeEpisodes] = useState<Episode[]>([]);
  const [isLoadingReelifeEpisodes, setIsLoadingReelifeEpisodes] =
    useState(false);
  const [reelifeEpisodesError, setReelifeEpisodesError] = useState<
    string | null
  >(null);
  const [liveReelifeDramas, setLiveReelifeDramas] = useState<Drama[]>([]);
  const [isLoadingReelifeFeed, setIsLoadingReelifeFeed] = useState(false);
  const [reelifeFeedError, setReelifeFeedError] = useState<string | null>(null);
  const [reelifeDramaCache, setReelifeDramaCache] = useState<Drama[]>([]);
  const [reelifeHasNextPage, setReelifeHasNextPage] = useState(false);

  const [freeReelsEpisodes, setFreeReelsEpisodes] = useState<Episode[]>([]);
  const [isLoadingFreeReelsEpisodes, setIsLoadingFreeReelsEpisodes] =
    useState(false);
  const [freeReelsEpisodesError, setFreeReelsEpisodesError] = useState<
    string | null
  >(null);
  const [liveFreeReelsDramas, setLiveFreeReelsDramas] = useState<Drama[]>([]);
  const [isLoadingFreeReelsFeed, setIsLoadingFreeReelsFeed] = useState(false);
  const [freeReelsFeedError, setFreeReelsFeedError] = useState<string | null>(
    null,
  );
  const [freeReelsDramaCache, setFreeReelsDramaCache] = useState<Drama[]>([]);
  const [freeReelsHasNextPage, setFreeReelsHasNextPage] = useState(false);

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
    if (isNetshortSource(selectedSource)) return netshortTab;
    if (isFlickreelsSource(selectedSource)) return flickreelsTab;
    if (isShortmaxSource(selectedSource)) return shortmaxTab;
    if (isGoodshortSource(selectedSource)) return goodshortTab;
    if (isIdramaSource(selectedSource)) return idramaTab;
    if (isReelifeSource(selectedSource)) return reelifeTab;
    if (isFreeReelsSource(selectedSource)) return freeReelsTab;
    return defaultSourceTab;
  }, [
    selectedSource,
    dramaBoxTab,
    reelShortTab,
    meloloTab,
    dramawaveTab,
    netshortTab,
    flickreelsTab,
    shortmaxTab,
    goodshortTab,
    idramaTab,
    reelifeTab,
    freeReelsTab,
    defaultSourceTab,
  ]);

  const handleSourceTabChange = useCallback(
    (tab: SourceTab) => {
      if (isDramaBoxSource(selectedSource)) {
        setDramaBoxPage(1);

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
        setReelShortPage(1);

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
        setDramawavePage(1);

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

      if (isNetshortSource(selectedSource)) {
        setNetshortPage(1);

        if (
          tab === "Beranda" ||
          tab === "ForYou" ||
          tab === "Teater" ||
          tab === "Acak"
        ) {
          setNetshortTab(tab);
        } else {
          setNetshortTab("Beranda");
        }
        return;
      }

      if (isFlickreelsSource(selectedSource)) {
        setFlickreelsPage(1);

        if (
          tab === "Beranda" ||
          tab === "ForYou" ||
          tab === "Trending" ||
          tab === "Acak"
        ) {
          setFlickreelsTab(tab);
        } else {
          setFlickreelsTab("Beranda");
        }
        return;
      }

      if (isShortmaxSource(selectedSource)) {
        setShortmaxPage(1);
        setShortmaxHasMorePages(true);

        if (
          tab === "Beranda" ||
          tab === "Terbaru" ||
          tab === "Trending" ||
          tab === "Hot"
        ) {
          setShortmaxTab(tab);
        } else {
          setShortmaxTab("Beranda");
        }
        return;
      }

      if (isGoodshortSource(selectedSource)) {
        setGoodshortPage(1);
        setGoodshortHasNextPage(false);

        if (
          tab === "Beranda" ||
          tab === "Populer" ||
          tab === "Trending" ||
          tab === "Acak"
        ) {
          setGoodshortTab(tab);
        } else {
          setGoodshortTab("Beranda");
        }
        return;
      }

      if (isIdramaSource(selectedSource)) {
        setIdramaPage(1);

        if (
          tab === "Beranda" ||
          tab === "Populer" ||
          tab === "Hot" ||
          tab === "Acak"
        ) {
          setIdramaTab(tab);
        } else {
          setIdramaTab("Beranda");
        }
        return;
      }

      if (isReelifeSource(selectedSource)) {
        setReelifePage(1);

        if (
          tab === "Beranda" ||
          tab === "Trending" ||
          tab === "Hot" ||
          tab === "Acak"
        ) {
          setReelifeTab(tab);
        } else {
          setReelifeTab("Beranda");
        }
        return;
      }

      if (isFreeReelsSource(selectedSource)) {
        setFreeReelsPage(1);

        if (
          tab === "Beranda" ||
          tab === "Populer" ||
          tab === "Terbaru" ||
          tab === "ForYou"
        ) {
          setFreeReelsTab(tab);
        } else {
          setFreeReelsTab("Beranda");
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
            : isNetshortDrama(selectedDrama)
              ? netshortEpisodes
              : isFlickreelsDrama(selectedDrama)
                ? flickreelsEpisodes
                : isShortmaxDrama(selectedDrama)
                  ? shortmaxEpisodes
                  : isGoodshortDrama(selectedDrama)
                    ? goodshortEpisodes
                    : isIdramaDrama(selectedDrama)
                      ? idramaEpisodes
                      : isReelifeDrama(selectedDrama)
                        ? reelifeEpisodes
                        : isFreeReelsDrama(selectedDrama)
                          ? freeReelsEpisodes
                          : episodes.filter(
                              (episode) => episode.dramaId === selectedDrama.id,
                            )
    : [];

  const handleSubmitSearch = useCallback(() => {
    setSubmittedSearchQuery(searchQuery.trim());

    if (isDramaBoxSource(selectedSource)) {
      setDramaBoxPage(1);
    }

    if (isReelShortSource(selectedSource)) {
      setReelShortPage(1);
    }

    if (isMeloloSource(selectedSource)) {
      setMeloloOffset(0);
    }

    if (isDramawaveSource(selectedSource)) {
      setDramawavePage(1);
    }

    if (isNetshortSource(selectedSource)) {
      setNetshortPage(1);
    }

    if (isFlickreelsSource(selectedSource)) {
      setFlickreelsPage(1);
    }

    if (isShortmaxSource(selectedSource)) {
      setShortmaxPage(1);
      setShortmaxHasMorePages(true);
    }

    if (isGoodshortSource(selectedSource)) {
      setGoodshortPage(1);
      setGoodshortHasNextPage(false);
    }

    if (isIdramaSource(selectedSource)) {
      setIdramaPage(1);
    }

    if (isReelifeSource(selectedSource)) {
      setReelifePage(1);
    }

    if (isFreeReelsSource(selectedSource)) {
      setFreeReelsPage(1);
    }
  }, [searchQuery, selectedSource]);

  useEffect(() => {
    if (!showSplash) return;
    if (isTelegramWebAppReady && isResolvingMembership) return;

    const timer = window.setTimeout(
      () => {
        setShowSplash(false);
      },
      isTelegramWebAppReady ? 400 : 300,
    );

    return () => window.clearTimeout(timer);
  }, [showSplash, isTelegramWebAppReady, isResolvingMembership]);

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
    let isMounted = true;

    const loadMembershipStatus = async () => {
      try {
        setIsResolvingMembership(true);

        if (isTelegramWebAppReady && canUseTelegramSync && telegramUserId) {
          const response = await fetch(
            `/api/user-membership?telegram_user_id=${telegramUserId}`,
            {
              method: "GET",
              cache: "no-store",
            },
          );

          if (!response.ok) {
            throw new Error("Gagal memuat membership Telegram.");
          }

          const data = await response.json();

          if (!isMounted) return;

          const nextStatus =
            data?.membership_status === "vip" ? "vip" : "free";
          setMembershipStatus(nextStatus);
          return;
        }

        const nextStatus = await loadMembershipFromWebSession();

        if (!isMounted) return;
        setMembershipStatus(nextStatus);
      } catch (error) {
        console.error("Gagal memuat membership:", error);

        if (!isMounted) return;

        setMembershipStatus("free");
      } finally {
        if (isMounted) {
          setIsResolvingMembership(false);
        }
      }
    };

    loadMembershipStatus();

    return () => {
      isMounted = false;
    };
  }, [isTelegramWebAppReady, canUseTelegramSync, telegramUserId]);

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
      const storedNetshortCache = window.localStorage.getItem(
        NETSHORT_CACHE_STORAGE_KEY,
      );

      if (storedNetshortCache) {
        const parsed = JSON.parse(storedNetshortCache);
        if (Array.isArray(parsed)) {
          setNetshortDramaCache(parsed);
        }
      }
    } catch (error) {
      console.error("Gagal membaca cache Netshort:", error);
    }
  }, []);

  useEffect(() => {
    try {
      const storedFlickreelsCache = window.localStorage.getItem(
        FLICKREELS_CACHE_STORAGE_KEY,
      );

      if (storedFlickreelsCache) {
        const parsed = JSON.parse(storedFlickreelsCache);
        if (Array.isArray(parsed)) {
          setFlickreelsDramaCache(parsed);
        }
      }
    } catch (error) {
      console.error("Gagal membaca cache Flickreels:", error);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.removeItem(SHORTMAX_CACHE_STORAGE_KEY);
      setShortmaxDramaCache([]);
    } catch (error) {
      console.error("Gagal membersihkan cache Shortmax:", error);
    }
  }, []);

  useEffect(() => {
    try {
      const storedIdramaCache = window.localStorage.getItem(
        IDRAMA_CACHE_STORAGE_KEY,
      );

      if (storedIdramaCache) {
        const parsed = JSON.parse(storedIdramaCache);
        if (Array.isArray(parsed)) {
          setIdramaDramaCache(parsed);
        }
      }
    } catch (error) {
      console.error("Gagal membaca cache iDrama:", error);
    }
  }, []);

  useEffect(() => {
    try {
      const storedReelifeCache = window.localStorage.getItem(
        REELIFE_CACHE_STORAGE_KEY,
      );

      if (storedReelifeCache) {
        const parsed = JSON.parse(storedReelifeCache);
        if (Array.isArray(parsed)) {
          setReelifeDramaCache(parsed);
        }
      }
    } catch (error) {
      console.error("Gagal membaca cache Reelife:", error);
    }
  }, []);

  useEffect(() => {
    try {
      const storedFreeReelsCache = window.localStorage.getItem(
        FREEREELS_CACHE_STORAGE_KEY,
      );

      if (storedFreeReelsCache) {
        const parsed = JSON.parse(storedFreeReelsCache);
        if (Array.isArray(parsed)) {
          setFreeReelsDramaCache(parsed);
        }
      }
    } catch (error) {
      console.error("Gagal membaca cache FreeReels:", error);
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
      window.localStorage.setItem(
        NETSHORT_CACHE_STORAGE_KEY,
        JSON.stringify(netshortDramaCache),
      );
    } catch (error) {
      console.error("Gagal menyimpan cache Netshort:", error);
    }
  }, [netshortDramaCache]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        FLICKREELS_CACHE_STORAGE_KEY,
        JSON.stringify(flickreelsDramaCache),
      );
    } catch (error) {
      console.error("Gagal menyimpan cache Flickreels:", error);
    }
  }, [flickreelsDramaCache]);

  useEffect(() => {
    // Temporary: disable writing Shortmax cache to avoid stale objects.
  }, [shortmaxDramaCache]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        IDRAMA_CACHE_STORAGE_KEY,
        JSON.stringify(idramaDramaCache),
      );
    } catch (error) {
      console.error("Gagal menyimpan cache iDrama:", error);
    }
  }, [idramaDramaCache]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        REELIFE_CACHE_STORAGE_KEY,
        JSON.stringify(reelifeDramaCache),
      );
    } catch (error) {
      console.error("Gagal menyimpan cache Reelife:", error);
    }
  }, [reelifeDramaCache]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        FREEREELS_CACHE_STORAGE_KEY,
        JSON.stringify(freeReelsDramaCache),
      );
    } catch (error) {
      console.error("Gagal menyimpan cache FreeReels:", error);
    }
  }, [freeReelsDramaCache]);

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
        const shortmaxHasMoreHeader = response.headers.get("x-has-more");
        const nextHasMore =
          shortmaxHasMoreHeader === null ? true : shortmaxHasMoreHeader === "1";

        if (!isMounted) return;

        setShortmaxHasMorePages(nextHasMore);

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

  const cacheNetshortDrama = useCallback((drama: Drama) => {
    if (!isNetshortDrama(drama)) return;

    setNetshortDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((item) => {
        map.set(item.id, item);
      });

      map.set(drama.id, drama);

      return Array.from(map.values());
    });
  }, []);

  const cacheFlickreelsDrama = useCallback((drama: Drama) => {
    if (!isFlickreelsDrama(drama)) return;

    setFlickreelsDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((item) => {
        map.set(item.id, item);
      });

      map.set(drama.id, drama);

      return Array.from(map.values());
    });
  }, []);

  const cacheShortmaxDrama = useCallback((drama: Drama) => {
    if (!isShortmaxDrama(drama)) return;

    const meta = drama as Drama & ShortmaxDramaMeta;
    const code =
      typeof meta.shortmaxDramaId === "string" &&
      meta.shortmaxDramaId.trim().length > 0
        ? meta.shortmaxDramaId.trim()
        : typeof drama.slug === "string"
          ? drama.slug.match(/shortmax-(\d+)/i)?.[1] || ""
          : "";

    const normalizedDrama =
      code.length > 0
        ? ({
            ...drama,
            id: Number(code) || drama.id,
            slug: drama.slug || `shortmax-${code}`,
            shortmaxDramaId: code,
          } as Drama)
        : drama;

    setShortmaxDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((item) => {
        map.set(item.id, item);
      });

      map.set(normalizedDrama.id, normalizedDrama);

      return Array.from(map.values());
    });
  }, []);

  const cacheGoodshortDrama = useCallback((drama: Drama) => {
    if (!isGoodshortDrama(drama)) return;

    const meta = drama as Drama & GoodshortDramaMeta;

    const code =
      (typeof meta.goodshortDramaId === "string" &&
      meta.goodshortDramaId.trim().length > 0
        ? meta.goodshortDramaId.trim()
        : "") ||
      (typeof meta.goodshortRawId === "string" &&
      meta.goodshortRawId.trim().length > 0
        ? meta.goodshortRawId.trim()
        : "");

    const normalizedDrama =
      code.length > 0
        ? ({
            ...drama,
            id: createStableNumericId(code, drama.id),
            slug: drama.slug || `goodshort-${code}`,
            goodshortDramaId: code,
            goodshortRawId: code,
          } as Drama)
        : drama;

    setGoodshortDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((item) => {
        map.set(item.id, item);
      });

      map.set(normalizedDrama.id, normalizedDrama);

      return Array.from(map.values());
    });
  }, []);

  const cacheIdramaDrama = useCallback((drama: Drama) => {
    if (!isIdramaDrama(drama)) return;

    const meta = drama as Drama & IdramaDramaMeta;

    const code =
      (typeof meta.idramaDramaId === "string" &&
      meta.idramaDramaId.trim().length > 0
        ? meta.idramaDramaId.trim()
        : "") ||
      (typeof meta.idramaRawId === "string" &&
      meta.idramaRawId.trim().length > 0
        ? meta.idramaRawId.trim()
        : "");

    const normalizedDrama =
      code.length > 0
        ? ({
            ...drama,
            id: createStableNumericId(code, drama.id),
            slug: drama.slug || `idrama-${code}`,
            idramaDramaId: code,
            idramaRawId: code,
          } as Drama)
        : drama;

    setIdramaDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((item) => {
        map.set(item.id, item);
      });

      map.set(normalizedDrama.id, normalizedDrama);

      return Array.from(map.values());
    });
  }, []);

  const cacheReelifeDrama = useCallback((drama: Drama) => {
    if (!isReelifeDrama(drama)) return;

    const meta = drama as Drama & ReelifeDramaMeta;

    const code =
      (typeof meta.reelifeDramaId === "string" &&
      meta.reelifeDramaId.trim().length > 0
        ? meta.reelifeDramaId.trim()
        : "") ||
      (typeof meta.reelifeRawId === "string" &&
      meta.reelifeRawId.trim().length > 0
        ? meta.reelifeRawId.trim()
        : "");

    const normalizedDrama =
      code.length > 0
        ? ({
            ...drama,
            id: createStableNumericId(code, drama.id),
            slug: drama.slug || `reelife-${code}`,
            reelifeDramaId: code,
            reelifeRawId: code,
          } as Drama)
        : drama;

    setReelifeDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((item) => {
        map.set(item.id, item);
      });

      map.set(normalizedDrama.id, normalizedDrama);

      return Array.from(map.values());
    });
  }, []);

  const cacheFreeReelsDrama = useCallback((drama: Drama) => {
    if (!isFreeReelsDrama(drama)) return;

    const meta = drama as Drama & FreeReelsDramaMeta;

    const code =
      (typeof meta.freereelsDramaId === "string" &&
      meta.freereelsDramaId.trim().length > 0
        ? meta.freereelsDramaId.trim()
        : "") ||
      (typeof meta.freereelsRawId === "string" &&
      meta.freereelsRawId.trim().length > 0
        ? meta.freereelsRawId.trim()
        : "");

    const normalizedDrama =
      code.length > 0
        ? ({
            ...drama,
            id: createStableNumericId(code, drama.id),
            slug: drama.slug || `freereels-${code}`,
            freereelsDramaId: code,
            freereelsRawId: code,
          } as Drama)
        : drama;

    setFreeReelsDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((item) => {
        map.set(item.id, item);
      });

      map.set(normalizedDrama.id, normalizedDrama);

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

    netshortDramaCache.forEach((drama) => {
      map.set(drama.id, drama);
    });

    flickreelsDramaCache.forEach((drama) => {
      map.set(drama.id, drama);
    });

    shortmaxDramaCache.forEach((drama) => {
      map.set(drama.id, drama);
    });

    goodshortDramaCache.forEach((drama) => {
      map.set(drama.id, drama);
    });

    idramaDramaCache.forEach((drama) => {
      map.set(drama.id, drama);
    });

    reelifeDramaCache.forEach((drama) => {
      map.set(drama.id, drama);
    });

    freeReelsDramaCache.forEach((drama) => {
      map.set(drama.id, drama);
    });

    return map;
  }, [
    dramas,
    dramaBoxDramaCache,
    reelShortDramaCache,
    meloloDramaCache,
    dramawaveDramaCache,
    netshortDramaCache,
    flickreelsDramaCache,
    shortmaxDramaCache,
    goodshortDramaCache,
    idramaDramaCache,
    reelifeDramaCache,
    freeReelsDramaCache,
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
      return;
    }

    if (isNetshortDrama(selectedDrama)) {
      cacheNetshortDrama(selectedDrama);
      return;
    }

    if (isFlickreelsDrama(selectedDrama)) {
      cacheFlickreelsDrama(selectedDrama);
      return;
    }

    if (isShortmaxDrama(selectedDrama)) {
      cacheShortmaxDrama(selectedDrama);
      return;
    }

    if (isGoodshortDrama(selectedDrama)) {
      cacheGoodshortDrama(selectedDrama);
      return;
    }

    if (isIdramaDrama(selectedDrama)) {
      cacheIdramaDrama(selectedDrama);
      return;
    }

    if (isReelifeDrama(selectedDrama)) {
      cacheReelifeDrama(selectedDrama);
      return;
    }

    if (isFreeReelsDrama(selectedDrama)) {
      cacheFreeReelsDrama(selectedDrama);
    }
  }, [
    selectedDrama,
    cacheDramaBoxDrama,
    cacheReelShortDrama,
    cacheMeloloDrama,
    cacheDramawaveDrama,
    cacheNetshortDrama,
    cacheFlickreelsDrama,
    cacheShortmaxDrama,
    cacheGoodshortDrama,
    cacheIdramaDrama,
    cacheReelifeDrama,
    cacheFreeReelsDrama,
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
      setDramaBoxHasNextPage(false);
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
          : getDramaBoxTabEndpoint(dramaBoxTab, dramaBoxPage);

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

        const normalizeDramaBoxDramas = (input: unknown): Drama[] => {
          if (!Array.isArray(input)) return [];

          return input.map((item, index) => {
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
              pickNumber("id", "book_id", "bookId", "dramaId", "drama_id") ||
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
        };

        const isDramaBoxPaginatedPayload =
          !shouldUseSearch &&
          data &&
          typeof data === "object" &&
          Array.isArray((data as { items?: unknown[] }).items);

        if (isDramaBoxPaginatedPayload) {
          const payload = data as {
            items: unknown[];
            hasNextPage?: boolean;
            page?: number;
          };

          const normalizedDramas = normalizeDramaBoxDramas(payload.items);
          setLiveDramaBoxDramas(normalizedDramas);
          setDramaBoxHasNextPage(Boolean(payload.hasNextPage));
        } else if (Array.isArray(data)) {
          const normalizedDramas = normalizeDramaBoxDramas(data);
          setLiveDramaBoxDramas(normalizedDramas);
          setDramaBoxHasNextPage(false);
        } else {
          setLiveDramaBoxDramas([]);
          setDramaBoxHasNextPage(false);
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
  }, [selectedSource, dramaBoxTab, dramaBoxPage, submittedSearchQuery]);

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

  const handleDramaBoxPrevPage = useCallback(() => {
    setDramaBoxPage((currentPage) => Math.max(1, currentPage - 1));
  }, []);

  const handleDramaBoxNextPage = useCallback(() => {
    setDramaBoxPage((currentPage) => {
      if (!dramaBoxHasNextPage) {
        return currentPage;
      }
      return currentPage + 1;
    });
  }, [dramaBoxHasNextPage]);

  const handleReelShortPrevPage = useCallback(() => {
    setReelShortPage((currentPage) => Math.max(1, currentPage - 1));
  }, []);

  const handleReelShortNextPage = useCallback(() => {
    setReelShortPage((currentPage) => {
      if (!reelShortHasNextPage) {
        return currentPage;
      }
      return currentPage + 1;
    });
  }, [reelShortHasNextPage]);

  const handleGoodshortPrevPage = useCallback(() => {
    setGoodshortPage((currentPage) => Math.max(1, currentPage - 1));
  }, []);

  const handleGoodshortNextPage = useCallback(() => {
    setGoodshortPage((currentPage) => {
      if (!goodshortHasNextPage) {
        return currentPage;
      }
      return currentPage + 1;
    });
  }, [goodshortHasNextPage]);

  const handleReelifePrevPage = useCallback(() => {
    setReelifePage((currentPage) => Math.max(1, currentPage - 1));
  }, []);

  const handleReelifeNextPage = useCallback(() => {
    setReelifePage((currentPage) => {
      if (!reelifeHasNextPage) {
        return currentPage;
      }
      return currentPage + 1;
    });
  }, [reelifeHasNextPage]);

  const handleFreeReelsPrevPage = useCallback(() => {
    setFreeReelsPage((currentPage) => Math.max(1, currentPage - 1));
  }, []);

  const handleFreeReelsNextPage = useCallback(() => {
    setFreeReelsPage((currentPage) => {
      if (!freeReelsHasNextPage) {
        return currentPage;
      }
      return currentPage + 1;
    });
  }, [freeReelsHasNextPage]);

  useEffect(() => {
    if (!isReelShortSource(selectedSource)) {
      setLiveReelShortDramas([]);
      setIsLoadingReelShortFeed(false);
      setReelShortFeedError(null);
      setReelShortHasNextPage(false);
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
          : getReelShortTabEndpoint(reelShortTab, reelShortPage);

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

        const isPaginatedPayload =
          !shouldUseSearch &&
          data &&
          typeof data === "object" &&
          Array.isArray((data as { items?: unknown[] }).items);

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

        const looksAdaptedDrama = (value: unknown): value is Drama => {
          if (!value || typeof value !== "object") return false;
          const record = value as Record<string, unknown>;
          return (
            typeof record.sourceName === "string" &&
            typeof record.sourceId === "string" &&
            typeof record.title === "string"
          );
        };

        const normalizedDramas = rawList.map((item, index) => {
          if (looksAdaptedDrama(item)) {
            const adapted = item as Drama & ReelShortDramaMeta;
            const stableRawId =
              (typeof adapted.reelShortRawId === "string" &&
                adapted.reelShortRawId.trim()) ||
              (typeof adapted.reelShortSlug === "string" &&
                adapted.reelShortSlug.match(/[a-f0-9]{24}/i)?.[0]) ||
              (typeof adapted.slug === "string" &&
                adapted.slug.match(/[a-f0-9]{24}/i)?.[0]) ||
              "";

            const stableCode =
              typeof adapted.reelShortCode === "string" &&
              adapted.reelShortCode.trim()
                ? adapted.reelShortCode.trim()
                : "";

            return {
              ...adapted,
              source: "ReelShort",
              sourceName: "ReelShort",
              sourceId: adapted.sourceId || selectedSource?.id || "2",
              reelShortRawId: stableRawId || adapted.reelShortRawId,
              reelShortCode: stableCode || adapted.reelShortCode,
              reelShortSlug:
                adapted.reelShortSlug ||
                adapted.slug ||
                (stableRawId ? `reelshort-${stableRawId}` : adapted.slug),
            } as Drama;
          }

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
              if (typeof value === "number" && Number.isFinite(value)) {
                return String(value);
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
            pickNumber(
              "id",
              "book_id",
              "bookId",
              "seriesId",
              "dramaId",
              "drama_id",
            ) || Date.now() + index;

          const normalizedId = createStableNumericId(
            reelShortRawId || `reelshort-${index}`,
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
        setReelShortHasNextPage(
          isPaginatedPayload
            ? Boolean((data as { hasNextPage?: unknown }).hasNextPage)
            : false,
        );
      } catch (error) {
        console.error("Gagal memuat feed ReelShort:", error);

        if (!isMounted) return;

        setLiveReelShortDramas([]);
        setReelShortHasNextPage(false);
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
  }, [selectedSource, reelShortTab, reelShortPage, submittedSearchQuery]);

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
      setMeloloHasNextPage(false);
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

        const isMeloloPaginatedPayload =
          data &&
          typeof data === "object" &&
          Array.isArray((data as { items?: unknown[] }).items);

        if (isMeloloPaginatedPayload) {
          const payload = data as {
            items: Drama[];
            hasNextPage?: boolean;
            page?: number;
          };

          setLiveMeloloDramas(payload.items ?? []);
          setMeloloHasNextPage(Boolean(payload.hasNextPage));
        } else if (Array.isArray(data)) {
          setLiveMeloloDramas(data as Drama[]);
          setMeloloHasNextPage((data as Drama[]).length > 0);
        } else {
          setLiveMeloloDramas([]);
          setMeloloHasNextPage(false);
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
          : getDramawaveTabEndpoint(dramawaveTab, dramawavePage);

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
  }, [selectedSource, dramawaveTab, dramawavePage, submittedSearchQuery]);

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
    if (!isNetshortSource(selectedSource)) {
      setLiveNetshortDramas([]);
      setIsLoadingNetshortFeed(false);
      setNetshortFeedError(null);
      return;
    }

    let isMounted = true;
    const keyword = submittedSearchQuery.trim();

    const loadNetshortFeed = async () => {
      setIsLoadingNetshortFeed(true);
      setNetshortFeedError(null);
      setLiveNetshortDramas([]);

      try {
        const shouldUseSearch = keyword.length > 0;
        const endpoint = shouldUseSearch
          ? getNetshortSearchEndpoint(keyword)
          : getNetshortTabEndpoint(netshortTab, netshortPage);

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Gagal memuat feed Netshort. endpoint=${endpoint} status=${response.status}`,
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
                  : Array.isArray((data as { list?: unknown[] })?.list)
                    ? (data as { list: unknown[] }).list
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
              if (typeof value === "number" && Number.isFinite(value)) {
                return String(value);
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

          const netshortRawId =
            pickString(
              "netshortDramaId",
              "netshortRawId",
              "shortPlayId",
              "short_play_id",
              "dramaId",
              "drama_id",
              "playlet_id",
              "bookId",
              "book_id",
              "id",
              "_id",
            ) || "";

          const fallbackNumericId =
            pickNumber(
              "id",
              "shortPlayId",
              "short_play_id",
              "dramaId",
              "drama_id",
              "playlet_id",
              "bookId",
              "book_id",
            ) || Date.now() + index;

          const normalizedId = createStableNumericId(
            netshortRawId || `netshort-${index}`,
            fallbackNumericId,
          );

          const normalizedTitle =
            pickString(
              "title",
              "name",
              "dramaName",
              "drama_name",
              "bookName",
              "book_name",
              "shortPlayName",
              "short_play_name",
            ) || "Tanpa Judul";

          const normalizedCoverImage = pickString(
            "cover",
            "coverUrl",
            "cover_url",
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
            "pic",
          );

          const normalizedPosterImage =
            pickString(
              "posterImage",
              "poster_image",
              "poster",
              "cover",
              "coverUrl",
              "cover_url",
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
              "pic",
            ) || normalizedCoverImage;

          const normalizedDescription = pickString(
            "introduction",
            "description",
            "summary",
            "intro",
            "synopsis",
            "desc",
          );

          const normalizedTags = Array.from(
            new Set([
              ...normalizeStringArray(rawItem.theme),
              ...normalizeStringArray(rawItem.tagNames),
              ...normalizeStringArray(rawItem.tags),
              ...normalizeStringArray(rawItem.category),
              ...normalizeStringArray(rawItem.genre),
              ...(netshortTab === "Teater" ? ["Teater"] : []),
              "Drama",
            ]),
          ).slice(0, 8);

          const normalizedDrama = {
            id: normalizedId,
            source: "Netshort",
            sourceId: "5",
            sourceName: "Netshort",
            title: normalizedTitle,
            episodes: pickNumber(
              "episodeCount",
              "episode_count",
              "episodes",
              "chapterCount",
              "totalEpisodes",
              "upload_num",
            ),
            badge:
              netshortTab === "ForYou"
                ? "ForYou"
                : netshortTab === "Teater"
                  ? "Teater"
                  : netshortTab === "Acak"
                    ? "Acak"
                    : "Netshort",
            tags: normalizedTags,
            posterClass: "from-[#10203A] via-[#12131A] to-[#090B12]",
            slug:
              pickString("slug", "shortPlaySlug", "short_play_slug") ||
              (netshortRawId
                ? `netshort-${netshortRawId}`
                : `netshort-${normalizedId}`),
            description: normalizedDescription,
            coverImage: normalizedCoverImage || undefined,
            posterImage: normalizedPosterImage || undefined,
            category: netshortTab === "Teater" ? "Teater" : "Drama",
            language: "in",
            country: undefined,
            isNew: netshortTab === "Beranda",
            isDubbed: false,
            isTrending: false,
            sortOrder:
              typeof rawItem.sort === "number"
                ? rawItem.sort
                : typeof rawItem.sort === "string"
                  ? Number(rawItem.sort) || index
                  : index,
            rating: undefined,
            releaseYear: undefined,
            netshortRawId: netshortRawId || undefined,
            netshortDramaId: netshortRawId || undefined,
          } as Drama & NetshortDramaMeta;

          return normalizedDrama as Drama;
        });

        setLiveNetshortDramas(normalizedDramas);
      } catch (error) {
        console.error("Gagal memuat feed Netshort:", error);

        if (!isMounted) return;

        setLiveNetshortDramas([]);
        setNetshortFeedError(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat feed Netshort.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingNetshortFeed(false);
        }
      }
    };

    loadNetshortFeed();

    return () => {
      isMounted = false;
    };
  }, [selectedSource, netshortTab, netshortPage, submittedSearchQuery]);

  useEffect(() => {
    if (liveNetshortDramas.length === 0) return;

    setNetshortDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((drama) => {
        map.set(drama.id, drama);
      });

      liveNetshortDramas.forEach((drama) => {
        map.set(drama.id, drama);
      });

      return Array.from(map.values());
    });
  }, [liveNetshortDramas]);

  useEffect(() => {
    if (!isFlickreelsSource(selectedSource)) {
      setLiveFlickreelsDramas([]);
      setIsLoadingFlickreelsFeed(false);
      setFlickreelsFeedError(null);
      return;
    }

    let isMounted = true;
    const keyword = submittedSearchQuery.trim();

    const loadFlickreelsFeed = async () => {
      setIsLoadingFlickreelsFeed(true);
      setFlickreelsFeedError(null);
      setLiveFlickreelsDramas([]);

      try {
        const shouldUseSearch = keyword.length > 0;
        const endpoint = shouldUseSearch
          ? getFlickreelsSearchEndpoint(keyword)
          : getFlickreelsTabEndpoint(flickreelsTab, flickreelsPage);

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Gagal memuat feed Flickreels. endpoint=${endpoint} status=${response.status}`,
          );
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setLiveFlickreelsDramas(data as Drama[]);
        } else {
          setLiveFlickreelsDramas([]);
          setFlickreelsFeedError("Format feed Flickreels tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat feed Flickreels:", error);

        if (!isMounted) return;

        setLiveFlickreelsDramas([]);
        setFlickreelsFeedError(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat feed Flickreels.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingFlickreelsFeed(false);
        }
      }
    };

    loadFlickreelsFeed();

    return () => {
      isMounted = false;
    };
  }, [selectedSource, flickreelsTab, flickreelsPage, submittedSearchQuery]);

  useEffect(() => {
    if (liveFlickreelsDramas.length === 0) return;

    setFlickreelsDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((drama) => {
        map.set(drama.id, drama);
      });

      liveFlickreelsDramas.forEach((drama) => {
        map.set(drama.id, drama);
      });

      return Array.from(map.values());
    });
  }, [liveFlickreelsDramas]);

  useEffect(() => {
    if (!isGoodshortSource(selectedSource)) {
      setLiveGoodshortDramas([]);
      setIsLoadingGoodshortFeed(false);
      setGoodshortFeedError(null);
      setGoodshortHasNextPage(false);
      return;
    }

    let isMounted = true;
    const keyword = submittedSearchQuery.trim();

    const loadGoodshortFeed = async () => {
      setIsLoadingGoodshortFeed(true);
      setGoodshortFeedError(null);
      setLiveGoodshortDramas([]);

      try {
        const shouldUseSearch = keyword.length > 0;
        const endpoint = shouldUseSearch
          ? getGoodshortSearchEndpoint(keyword)
          : getGoodshortTabEndpoint(goodshortTab, goodshortPage);

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Gagal memuat feed GoodShort. endpoint=${endpoint} status=${response.status}`,
          );
        }

        const data = await response.json();

        if (!isMounted) return;

        const headerHasMore = response.headers.get("x-has-more");
        const parsedHasMore =
          headerHasMore === null ? null : headerHasMore === "1";

        if (Array.isArray(data)) {
          setLiveGoodshortDramas(data as Drama[]);

          if (shouldUseSearch || goodshortTab === "Trending") {
            setGoodshortHasNextPage(false);
          } else if (parsedHasMore !== null) {
            setGoodshortHasNextPage(parsedHasMore);
          } else {
            setGoodshortHasNextPage((data as Drama[]).length > 0);
          }
        } else {
          setLiveGoodshortDramas([]);
          setGoodshortHasNextPage(false);
          setGoodshortFeedError("Format feed GoodShort tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat feed GoodShort:", error);

        if (!isMounted) return;

        setLiveGoodshortDramas([]);
        setGoodshortHasNextPage(false);
        setGoodshortFeedError(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat feed GoodShort.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingGoodshortFeed(false);
        }
      }
    };

    loadGoodshortFeed();

    return () => {
      isMounted = false;
    };
  }, [selectedSource, goodshortTab, goodshortPage, submittedSearchQuery]);

  useEffect(() => {
    if (liveGoodshortDramas.length === 0) return;

    setGoodshortDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((drama) => {
        map.set(drama.id, drama);
      });

      liveGoodshortDramas.forEach((drama) => {
        map.set(drama.id, drama);
      });

      return Array.from(map.values());
    });
  }, [liveGoodshortDramas]);

  useEffect(() => {
    if (!selectedDrama || !isGoodshortDrama(selectedDrama)) {
      setGoodshortEpisodes([]);
      setIsLoadingGoodshortEpisodes(false);
      setGoodshortEpisodesError(null);
      return;
    }

    let isMounted = true;

    const loadGoodshortEpisodes = async () => {
      setIsLoadingGoodshortEpisodes(true);
      setGoodshortEpisodesError(null);
      setGoodshortEpisodes([]);
      setSelectedEpisode(null);

      try {
        const goodshortDramaId = extractGoodshortDramaId(selectedDrama);

        if (!goodshortDramaId) {
          throw new Error("ID asli GoodShort tidak ditemukan dari feed.");
        }

        const response = await fetch(
          `/api/goodshort/episodes?dramaId=${encodeURIComponent(goodshortDramaId)}&numericDramaId=${selectedDrama.id}`,
        );

        if (!response.ok) {
          throw new Error("Gagal memuat episode GoodShort.");
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setGoodshortEpisodes(data);

          if (data.length === 0) {
            setGoodshortEpisodesError(
              "Episode belum tersedia untuk drama ini.",
            );
          }
        } else {
          setGoodshortEpisodes([]);
          setGoodshortEpisodesError("Format episode GoodShort tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat episode GoodShort:", error);

        if (isMounted) {
          setGoodshortEpisodes([]);
          setGoodshortEpisodesError(
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat memuat episode GoodShort.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingGoodshortEpisodes(false);
        }
      }
    };

    loadGoodshortEpisodes();

    return () => {
      isMounted = false;
    };
  }, [selectedDrama]);

  useEffect(() => {
    if (!selectedDrama || !isGoodshortDrama(selectedDrama)) return;
    if (selectedEpisode) return;
    if (goodshortEpisodes.length === 0) return;

    const resumeEpisode = getResumeEpisodeFromHistory(
      selectedDrama.id,
      goodshortEpisodes,
      historyByDramaId,
    );

    const fallbackEpisode = goodshortEpisodes[0] ?? null;
    const targetEpisode = resumeEpisode ?? fallbackEpisode;

    if (!targetEpisode) return;

    setSelectedEpisode(targetEpisode);
    handleSaveToHistory(selectedDrama.id, targetEpisode.id);
  }, [
    selectedDrama,
    selectedEpisode,
    goodshortEpisodes,
    historyByDramaId,
    handleSaveToHistory,
  ]);

  useEffect(() => {
    if (!selectedDrama || !isNetshortDrama(selectedDrama)) return;
    if (selectedEpisode) return;
    if (netshortEpisodes.length === 0) return;

    const resumeEpisode = getResumeEpisodeFromHistory(
      selectedDrama.id,
      netshortEpisodes,
      historyByDramaId,
    );

    const fallbackEpisode = netshortEpisodes[0] ?? null;
    const targetEpisode = resumeEpisode ?? fallbackEpisode;

    if (!targetEpisode) return;

    setSelectedEpisode(targetEpisode);
    handleSaveToHistory(selectedDrama.id, targetEpisode.id);
  }, [
    selectedDrama,
    selectedEpisode,
    netshortEpisodes,
    historyByDramaId,
    handleSaveToHistory,
  ]);

  useEffect(() => {
    if (!selectedDrama || !isNetshortDrama(selectedDrama)) {
      setNetshortEpisodes([]);
      setIsLoadingNetshortEpisodes(false);
      setNetshortEpisodesError(null);
      return;
    }

    let isMounted = true;

    const loadNetshortEpisodes = async () => {
      setIsLoadingNetshortEpisodes(true);
      setNetshortEpisodesError(null);
      setNetshortEpisodes([]);
      setSelectedEpisode(null);

      try {
        const netshortDramaId = extractNetshortDramaId(selectedDrama);

        if (!netshortDramaId) {
          throw new Error(
            "ID asli Netshort tidak ditemukan dari feed. Periksa field shortPlayId.",
          );
        }

        const response = await fetch(
          `/api/netshort/episodes?dramaId=${encodeURIComponent(netshortDramaId)}&numericDramaId=${selectedDrama.id}`,
        );

        if (!response.ok) {
          throw new Error("Gagal memuat episode Netshort.");
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setNetshortEpisodes(data);

          if (data.length === 0) {
            setNetshortEpisodesError("Episode belum tersedia untuk drama ini.");
          }
        } else {
          setNetshortEpisodes([]);
          setNetshortEpisodesError("Format episode Netshort tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat episode Netshort:", error);

        if (isMounted) {
          setNetshortEpisodes([]);
          setNetshortEpisodesError(
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat memuat episode Netshort.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingNetshortEpisodes(false);
        }
      }
    };

    loadNetshortEpisodes();

    return () => {
      isMounted = false;
    };
  }, [selectedDrama]);

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

        const params = new URLSearchParams({
          id: reelShortRawId,
          dramaId: String(selectedDrama.id),
        });

        if (reelShortCode?.trim()) {
          params.set("code", reelShortCode.trim());
        }

        const response = await fetch(
          `/api/reelshort/episodes?${params.toString()}`,
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

  useEffect(() => {
    if (!selectedDrama || !isFlickreelsDrama(selectedDrama)) return;
    if (selectedEpisode) return;
    if (flickreelsEpisodes.length === 0) return;

    const resumeEpisode = getResumeEpisodeFromHistory(
      selectedDrama.id,
      flickreelsEpisodes,
      historyByDramaId,
    );

    const fallbackEpisode = flickreelsEpisodes[0] ?? null;
    const targetEpisode = resumeEpisode ?? fallbackEpisode;

    if (!targetEpisode) return;

    setSelectedEpisode(targetEpisode);
    handleSaveToHistory(selectedDrama.id, targetEpisode.id);
  }, [
    selectedDrama,
    selectedEpisode,
    flickreelsEpisodes,
    historyByDramaId,
    handleSaveToHistory,
  ]);

  useEffect(() => {
    if (!selectedDrama || !isFlickreelsDrama(selectedDrama)) {
      setFlickreelsEpisodes([]);
      setIsLoadingFlickreelsEpisodes(false);
      setFlickreelsEpisodesError(null);
      return;
    }

    let isMounted = true;

    const loadFlickreelsEpisodes = async () => {
      setIsLoadingFlickreelsEpisodes(true);
      setFlickreelsEpisodesError(null);
      setFlickreelsEpisodes([]);
      setSelectedEpisode(null);

      try {
        const flickreelsDramaId = extractFlickreelsDramaId(selectedDrama);

        if (!flickreelsDramaId) {
          throw new Error(
            "ID asli Flickreels tidak ditemukan dari feed. Periksa field playlet_id.",
          );
        }

        const response = await fetch(
          `/api/flickreels/episodes?dramaId=${encodeURIComponent(flickreelsDramaId)}&numericDramaId=${selectedDrama.id}`,
        );

        if (!response.ok) {
          throw new Error("Gagal memuat episode Flickreels.");
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setFlickreelsEpisodes(data);

          if (data.length === 0) {
            setFlickreelsEpisodesError(
              "Episode belum tersedia untuk drama ini.",
            );
          }
        } else {
          setFlickreelsEpisodes([]);
          setFlickreelsEpisodesError("Format episode Flickreels tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat episode Flickreels:", error);

        if (isMounted) {
          setFlickreelsEpisodes([]);
          setFlickreelsEpisodesError(
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat memuat episode Flickreels.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingFlickreelsEpisodes(false);
        }
      }
    };

    loadFlickreelsEpisodes();

    return () => {
      isMounted = false;
    };
  }, [selectedDrama]);

  useEffect(() => {
    if (!isShortmaxSource(selectedSource)) {
      setLiveShortmaxDramas([]);
      setIsLoadingShortmaxFeed(false);
      setShortmaxFeedError(null);
      setShortmaxHasMorePages(true);
      return;
    }

    let isMounted = true;

    const loadShortmaxFeed = async () => {
      setIsLoadingShortmaxFeed(true);
      setShortmaxFeedError(null);
      setLiveShortmaxDramas([]);

      try {
        const endpoint = getShortmaxTabEndpoint(shortmaxTab, shortmaxPage);

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Gagal memuat feed Shortmax. endpoint=${endpoint} status=${response.status}`,
          );
        }

        const data = await response.json();

        if (!isMounted) return;

        const rawList = Array.isArray(data)
          ? data
          : Array.isArray((data as { data?: { list?: unknown[] } })?.data?.list)
            ? (data as { data: { list: unknown[] } }).data.list
            : Array.isArray((data as { data?: unknown[] })?.data)
              ? (data as { data: unknown[] }).data
              : Array.isArray((data as { items?: unknown[] })?.items)
                ? (data as { items: unknown[] }).items
                : Array.isArray((data as { list?: unknown[] })?.list)
                  ? (data as { list: unknown[] }).list
                  : Array.isArray((data as { results?: unknown[] })?.results)
                    ? (data as { results: unknown[] }).results
                    : [];

        const normalizedDramas = rawList
          .map((item: unknown, index: number) => {
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
                if (typeof value === "number" && Number.isFinite(value)) {
                  return String(value);
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

            const shortmaxCode = pickString("code");
            const shortmaxRawId = pickString("id");
            const normalizedTitle =
              pickString("name", "title") || "Tanpa Judul";

            const numericCode = Number(shortmaxCode);
            const fallbackNumericId =
              pickNumber("code", "id", "dramaId", "bookId") ||
              Date.now() + index;

            const normalizedId =
              Number.isFinite(numericCode) && numericCode > 0
                ? numericCode
                : fallbackNumericId;

            const normalizedCoverImage = pickString(
              "cover",
              "coverUrl",
              "cover_url",
              "coverImage",
              "cover_image",
              "poster",
              "posterImage",
              "poster_image",
              "thumbnail",
              "thumb",
              "image",
              "imageUrl",
              "image_url",
              "pic",
            );

            const normalizedPosterImage =
              pickString(
                "posterImage",
                "poster_image",
                "poster",
                "cover",
                "coverUrl",
                "cover_url",
                "coverImage",
                "cover_image",
                "thumbnail",
                "thumb",
                "image",
                "imageUrl",
                "image_url",
                "pic",
              ) || normalizedCoverImage;

            const normalizedDescription = pickString(
              "summary",
              "description",
              "intro",
              "synopsis",
            );

            const normalizedTags = Array.from(
              new Set([
                ...normalizeStringArray(rawItem.tags),
                ...normalizeStringArray(rawItem.category),
                ...normalizeStringArray(rawItem.genre),
                "Drama",
              ]),
            ).slice(0, 8);

            const rawEpisodeCount = pickNumber(
              "totalEpisodes",
              "episodes",
              "episodeCount",
            );
            const safeEpisodeCount =
              shortmaxTab === "Beranda" && rawEpisodeCount <= 1
                ? 0
                : rawEpisodeCount;

            const normalizedDrama = {
              id: normalizedId,
              source: "Shortmax",
              sourceId: "7",
              sourceName: "Shortmax",
              title: normalizedTitle,
              episodes: safeEpisodeCount,
              badge:
                shortmaxTab === "Terbaru"
                  ? "Terbaru"
                  : shortmaxTab === "Trending"
                    ? "Trending"
                    : shortmaxTab === "Hot"
                      ? "Hot"
                      : "Shortmax",
              tags: normalizedTags,
              posterClass: "from-[#1B1228] via-[#12131A] to-[#090B12]",
              slug: `shortmax-${shortmaxCode || shortmaxRawId || normalizedId}`,
              description: normalizedDescription,
              coverImage: normalizedCoverImage || undefined,
              posterImage: normalizedPosterImage || undefined,
              category: "Drama",
              language: "id",
              country: undefined,
              isNew: shortmaxTab === "Terbaru",
              isDubbed: normalizedTitle.toLowerCase().includes("dubbing"),
              isTrending: shortmaxTab === "Trending" || shortmaxTab === "Hot",
              sortOrder: index,
              rating: undefined,
              releaseYear: undefined,
              shortmaxRawId: shortmaxRawId || undefined,
              shortmaxDramaId: shortmaxCode || undefined,
            } as Drama & ShortmaxDramaMeta;

            return normalizedDrama as Drama;
          })
          .filter((item): item is Drama => !!item);

        setLiveShortmaxDramas(dedupeShortmaxDramas(normalizedDramas));
      } catch (error) {
        console.error("Gagal memuat feed Shortmax:", error);

        if (!isMounted) return;

        setLiveShortmaxDramas([]);
        setShortmaxHasMorePages(false);
        setShortmaxFeedError(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat feed Shortmax.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingShortmaxFeed(false);
        }
      }
    };

    loadShortmaxFeed();

    return () => {
      isMounted = false;
    };
  }, [selectedSource, shortmaxTab, shortmaxPage]);

  useEffect(() => {
    if (liveShortmaxDramas.length === 0) return;

    setShortmaxDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((drama) => {
        map.set(drama.id, drama);
      });

      liveShortmaxDramas.forEach((drama) => {
        map.set(drama.id, drama);
      });

      return Array.from(map.values());
    });
  }, [liveShortmaxDramas]);

  useEffect(() => {
    if (!selectedDrama || !isShortmaxDrama(selectedDrama)) return;
    if (selectedEpisode) return;
    if (shortmaxEpisodes.length === 0) return;

    const resumeEpisode = getResumeEpisodeFromHistory(
      selectedDrama.id,
      shortmaxEpisodes,
      historyByDramaId,
    );

    const fallbackEpisode = shortmaxEpisodes[0] ?? null;
    const targetEpisode = resumeEpisode ?? fallbackEpisode;

    if (!targetEpisode) return;

    setSelectedEpisode(targetEpisode);
    handleSaveToHistory(selectedDrama.id, targetEpisode.id);
  }, [
    selectedDrama,
    selectedEpisode,
    shortmaxEpisodes,
    historyByDramaId,
    handleSaveToHistory,
  ]);

  useEffect(() => {
    if (!selectedDrama || !isShortmaxDrama(selectedDrama)) {
      setShortmaxEpisodes([]);
      setIsLoadingShortmaxEpisodes(false);
      setShortmaxEpisodesError(null);
      return;
    }

    let isMounted = true;

    const loadShortmaxEpisodes = async () => {
      setIsLoadingShortmaxEpisodes(true);
      setShortmaxEpisodesError(null);
      setShortmaxEpisodes([]);
      setSelectedEpisode(null);

      try {
        const shortmaxDramaId = extractShortmaxDramaId(selectedDrama);

        if (!shortmaxDramaId) {
          throw new Error(
            "ID asli Shortmax tidak ditemukan dari feed. Periksa field code.",
          );
        }

        const response = await fetch(
          `/api/shortmax/episodes?dramaId=${encodeURIComponent(shortmaxDramaId)}&numericDramaId=${selectedDrama.id}`,
        );

        if (!response.ok) {
          throw new Error("Gagal memuat episode Shortmax.");
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setShortmaxEpisodes(data);

          if (data.length === 0) {
            setShortmaxEpisodesError("Episode belum tersedia untuk drama ini.");
          }
        } else {
          setShortmaxEpisodes([]);
          setShortmaxEpisodesError("Format episode Shortmax tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat episode Shortmax:", error);

        if (isMounted) {
          setShortmaxEpisodes([]);
          setShortmaxEpisodesError(
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat memuat episode Shortmax.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingShortmaxEpisodes(false);
        }
      }
    };

    loadShortmaxEpisodes();

    return () => {
      isMounted = false;
    };
  }, [selectedDrama]);

  useEffect(() => {
    if (!isReelifeSource(selectedSource)) {
      setLiveReelifeDramas([]);
      setIsLoadingReelifeFeed(false);
      setReelifeFeedError(null);
      setReelifeHasNextPage(false);
      return;
    }

    let isMounted = true;
    const keyword = submittedSearchQuery.trim();

    const loadReelifeFeed = async () => {
      setIsLoadingReelifeFeed(true);
      setReelifeFeedError(null);
      setLiveReelifeDramas([]);

      try {
        const endpoint = getReelifeFeedEndpoint(
          keyword,
          reelifeTab,
          reelifePage,
        );

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Gagal memuat feed Reelife. endpoint=${endpoint} status=${response.status}`,
          );
        }

        const data = await response.json();

        if (!isMounted) return;

        const normalized = Array.isArray(data)
          ? data
          : Array.isArray((data as { items?: Drama[] }).items)
            ? (data as { items: Drama[] }).items
            : [];

        setLiveReelifeDramas(normalized as Drama[]);
        setReelifeHasNextPage(
          keyword.length === 0 &&
            data &&
            typeof data === "object" &&
            !Array.isArray(data)
            ? Boolean((data as { hasNextPage?: unknown }).hasNextPage)
            : false,
        );
      } catch (error) {
        console.error("Gagal memuat feed Reelife:", error);

        if (!isMounted) return;

        setLiveReelifeDramas([]);
        setReelifeHasNextPage(false);
        setReelifeFeedError(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat feed Reelife.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingReelifeFeed(false);
        }
      }
    };

    loadReelifeFeed();

    return () => {
      isMounted = false;
    };
  }, [selectedSource, reelifeTab, reelifePage, submittedSearchQuery]);

  useEffect(() => {
    if (liveReelifeDramas.length === 0) return;

    setReelifeDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((drama) => {
        map.set(drama.id, drama);
      });

      liveReelifeDramas.forEach((drama) => {
        map.set(drama.id, drama);
      });

      return Array.from(map.values());
    });
  }, [liveReelifeDramas]);

  useEffect(() => {
    if (!selectedDrama || !isReelifeDrama(selectedDrama)) {
      setReelifeEpisodes([]);
      setIsLoadingReelifeEpisodes(false);
      setReelifeEpisodesError(null);
      return;
    }

    let isMounted = true;

    const loadReelifeEpisodes = async () => {
      setIsLoadingReelifeEpisodes(true);
      setReelifeEpisodesError(null);
      setReelifeEpisodes([]);
      setSelectedEpisode(null);

      try {
        const reelifeDramaId = extractReelifeDramaId(selectedDrama);
        const { reelifeCode } = getReelifeMeta(selectedDrama);

        if (!reelifeDramaId) {
          throw new Error("ID asli Reelife tidak ditemukan dari feed.");
        }

        const response = await fetch(
          `/api/reelife/episodes?dramaId=${encodeURIComponent(reelifeDramaId)}&numericDramaId=${selectedDrama.id}&code=${encodeURIComponent(reelifeCode || "")}`,
        );

        if (!response.ok) {
          throw new Error("Gagal memuat episode Reelife.");
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setReelifeEpisodes(data);

          if (data.length === 0) {
            setReelifeEpisodesError("Episode belum tersedia untuk drama ini.");
          }
        } else {
          setReelifeEpisodes([]);
          setReelifeEpisodesError("Format episode Reelife tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat episode Reelife:", error);

        if (isMounted) {
          setReelifeEpisodes([]);
          setReelifeEpisodesError(
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat memuat episode Reelife.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingReelifeEpisodes(false);
        }
      }
    };

    loadReelifeEpisodes();

    return () => {
      isMounted = false;
    };
  }, [selectedDrama]);

  useEffect(() => {
    if (!selectedDrama || !isReelifeDrama(selectedDrama)) return;
    if (selectedEpisode) return;
    if (reelifeEpisodes.length === 0) return;

    const resumeEpisode = getResumeEpisodeFromHistory(
      selectedDrama.id,
      reelifeEpisodes,
      historyByDramaId,
    );

    const fallbackEpisode = reelifeEpisodes[0] ?? null;
    const targetEpisode = resumeEpisode ?? fallbackEpisode;

    if (!targetEpisode) return;

    setSelectedEpisode(targetEpisode);
    handleSaveToHistory(selectedDrama.id, targetEpisode.id);
  }, [
    selectedDrama,
    selectedEpisode,
    reelifeEpisodes,
    historyByDramaId,
    handleSaveToHistory,
  ]);

  const visibleHomeSources = useMemo(
    () => sources.filter(isSourceVisibleOnHome),
    [sources],
  );

  const popularSources = useMemo(
    () =>
      visibleHomeSources
        .filter((source) => source.isPopular)
        .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)),
    [visibleHomeSources],
  );

  const otherSources = useMemo(
    () =>
      visibleHomeSources
        .filter((source) => !source.isPopular)
        .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999)),
    [visibleHomeSources],
  );

  useEffect(() => {
    if (!isIdramaSource(selectedSource)) {
      setLiveIdramaDramas([]);
      setIsLoadingIdramaFeed(false);
      setIdramaFeedError(null);
      return;
    }

    let isMounted = true;
    const keyword = submittedSearchQuery.trim();

    const loadIdramaFeed = async () => {
      setIsLoadingIdramaFeed(true);
      setIdramaFeedError(null);
      setLiveIdramaDramas([]);

      try {
        const shouldUseSearch = keyword.length > 0;
        const endpoint = shouldUseSearch
          ? getIdramaSearchEndpoint(keyword, idramaPage)
          : getIdramaTabEndpoint(idramaTab, idramaPage);

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Gagal memuat feed iDrama. endpoint=${endpoint} status=${response.status}`,
          );
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setLiveIdramaDramas(data);
        } else {
          setLiveIdramaDramas([]);
          setIdramaFeedError("Format feed iDrama tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat feed iDrama:", error);

        if (!isMounted) return;

        setLiveIdramaDramas([]);
        setIdramaFeedError(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat feed iDrama.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingIdramaFeed(false);
        }
      }
    };

    loadIdramaFeed();

    return () => {
      isMounted = false;
    };
  }, [selectedSource, idramaTab, idramaPage, submittedSearchQuery]);

  useEffect(() => {
    if (liveIdramaDramas.length === 0) return;

    setIdramaDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((drama) => {
        map.set(drama.id, drama);
      });

      liveIdramaDramas.forEach((drama) => {
        map.set(drama.id, drama);
      });

      return Array.from(map.values());
    });
  }, [liveIdramaDramas]);

  useEffect(() => {
    if (!selectedDrama || !isIdramaDrama(selectedDrama)) {
      setIdramaEpisodes([]);
      setIsLoadingIdramaEpisodes(false);
      setIdramaEpisodesError(null);
      return;
    }

    let isMounted = true;

    const loadIdramaEpisodes = async () => {
      setIsLoadingIdramaEpisodes(true);
      setIdramaEpisodesError(null);
      setIdramaEpisodes([]);
      setSelectedEpisode(null);

      try {
        const idramaDramaId = extractIdramaDramaId(selectedDrama);
        const { idramaCode } = getIdramaMeta(selectedDrama);

        if (!idramaDramaId) {
          throw new Error("ID asli iDrama tidak ditemukan dari feed.");
        }

        const response = await fetch(
          `/api/idrama/episodes?dramaId=${encodeURIComponent(idramaDramaId)}&numericDramaId=${selectedDrama.id}&code=${encodeURIComponent(idramaCode || "")}`,
        );

        if (!response.ok) {
          throw new Error("Gagal memuat episode iDrama.");
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setIdramaEpisodes(data);

          if (data.length === 0) {
            setIdramaEpisodesError("Episode belum tersedia untuk drama ini.");
          }
        } else {
          setIdramaEpisodes([]);
          setIdramaEpisodesError("Format episode iDrama tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat episode iDrama:", error);

        if (isMounted) {
          setIdramaEpisodes([]);
          setIdramaEpisodesError(
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat memuat episode iDrama.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingIdramaEpisodes(false);
        }
      }
    };

    loadIdramaEpisodes();

    return () => {
      isMounted = false;
    };
  }, [selectedDrama]);

  useEffect(() => {
    if (!selectedDrama || !isIdramaDrama(selectedDrama)) return;
    if (selectedEpisode) return;
    if (idramaEpisodes.length === 0) return;

    const resumeEpisode = getResumeEpisodeFromHistory(
      selectedDrama.id,
      idramaEpisodes,
      historyByDramaId,
    );

    const fallbackEpisode = idramaEpisodes[0] ?? null;
    const targetEpisode = resumeEpisode ?? fallbackEpisode;

    if (!targetEpisode) return;

    setSelectedEpisode(targetEpisode);
    handleSaveToHistory(selectedDrama.id, targetEpisode.id);
  }, [
    selectedDrama,
    selectedEpisode,
    idramaEpisodes,
    historyByDramaId,
    handleSaveToHistory,
  ]);

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

  useEffect(() => {
    if (!isFreeReelsSource(selectedSource)) {
      setLiveFreeReelsDramas([]);
      setIsLoadingFreeReelsFeed(false);
      setFreeReelsFeedError(null);
      setFreeReelsHasNextPage(false);
      return;
    }

    let isMounted = true;
    const keyword = submittedSearchQuery.trim();

    const loadFreeReelsFeed = async () => {
      setIsLoadingFreeReelsFeed(true);
      setFreeReelsFeedError(null);
      setLiveFreeReelsDramas([]);

      try {
        const endpoint = getFreeReelsFeedEndpoint(
          keyword,
          freeReelsTab,
          freeReelsPage,
        );

        const response = await fetch(endpoint, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            `Gagal memuat feed FreeReels. endpoint=${endpoint} status=${response.status}`,
          );
        }

        const data = await response.json();

        if (!isMounted) return;

        const isPaginatedPayload =
          keyword.length === 0 &&
          data &&
          typeof data === "object" &&
          Array.isArray((data as { items?: Drama[] }).items);

        if (isPaginatedPayload) {
          const payload = data as {
            items: Drama[];
            hasNextPage?: boolean;
            page?: number;
          };

          const deduped = dedupeFreeReelsDramas(payload.items ?? []);
          setLiveFreeReelsDramas(deduped);
          setFreeReelsHasNextPage(Boolean(payload.hasNextPage));
        } else if (Array.isArray(data)) {
          const deduped = dedupeFreeReelsDramas(data as Drama[]);
          setLiveFreeReelsDramas(deduped);
          setFreeReelsHasNextPage(false);
        } else {
          setLiveFreeReelsDramas([]);
          setFreeReelsHasNextPage(false);
          setFreeReelsFeedError("Format feed FreeReels tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat feed FreeReels:", error);

        if (!isMounted) return;

        setLiveFreeReelsDramas([]);
        setFreeReelsHasNextPage(false);
        setFreeReelsFeedError(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat feed FreeReels.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingFreeReelsFeed(false);
        }
      }
    };

    loadFreeReelsFeed();

    return () => {
      isMounted = false;
    };
  }, [selectedSource, freeReelsTab, freeReelsPage, submittedSearchQuery]);

  useEffect(() => {
    if (liveFreeReelsDramas.length === 0) return;

    setFreeReelsDramaCache((currentCache) => {
      const map = new Map<number, Drama>();

      currentCache.forEach((drama) => {
        map.set(drama.id, drama);
      });

      dedupeFreeReelsDramas(liveFreeReelsDramas).forEach((drama) => {
        map.set(drama.id, drama);
      });

      return Array.from(map.values());
    });
  }, [liveFreeReelsDramas]);

  useEffect(() => {
    if (!selectedDrama || !isFreeReelsDrama(selectedDrama)) {
      setFreeReelsEpisodes([]);
      setIsLoadingFreeReelsEpisodes(false);
      setFreeReelsEpisodesError(null);
      return;
    }

    let isMounted = true;

    const loadFreeReelsEpisodes = async () => {
      setIsLoadingFreeReelsEpisodes(true);
      setFreeReelsEpisodesError(null);
      setFreeReelsEpisodes([]);

      const bootstrapEpisode = createFreeReelsBootstrapEpisode(selectedDrama);
      setSelectedEpisode(bootstrapEpisode);

      try {
        const freeReelsDramaId = extractFreeReelsDramaId(selectedDrama);
        const { freereelsCode } = getFreeReelsMeta(selectedDrama);

        if (!freeReelsDramaId) {
          throw new Error("ID asli FreeReels tidak ditemukan dari feed.");
        }

        const params = new URLSearchParams({
          dramaId: freeReelsDramaId,
          numericDramaId: String(selectedDrama.id),
        });

        if (freereelsCode?.trim()) {
          params.set("code", freereelsCode.trim());
        }

        const response = await fetch(
          `/api/freereels/episodes?${params.toString()}`,
        );

        if (!response.ok) {
          throw new Error("Gagal memuat episode FreeReels.");
        }

        const data = await response.json();

        if (!isMounted) return;

        if (Array.isArray(data)) {
          setFreeReelsEpisodes(data);

          if (data.length === 0) {
            setFreeReelsEpisodesError(
              "Episode belum tersedia untuk drama ini.",
            );
          }
        } else {
          setFreeReelsEpisodes(bootstrapEpisode ? [bootstrapEpisode] : []);
          setFreeReelsEpisodesError("Format episode FreeReels tidak valid.");
        }
      } catch (error) {
        console.error("Gagal memuat episode FreeReels:", error);

        if (isMounted) {
          setFreeReelsEpisodes(bootstrapEpisode ? [bootstrapEpisode] : []);
          setFreeReelsEpisodesError(
            error instanceof Error
              ? error.message
              : "Terjadi kesalahan saat memuat episode FreeReels.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingFreeReelsEpisodes(false);
        }
      }
    };

    loadFreeReelsEpisodes();

    return () => {
      isMounted = false;
    };
  }, [selectedDrama]);

  useEffect(() => {
    if (!selectedDrama || !isFreeReelsDrama(selectedDrama)) return;
    if (selectedEpisode) return;
    if (freeReelsEpisodes.length === 0) return;

    const resumeEpisode = getResumeEpisodeFromHistory(
      selectedDrama.id,
      freeReelsEpisodes,
      historyByDramaId,
    );

    const fallbackEpisode = freeReelsEpisodes[0] ?? null;
    const targetEpisode = resumeEpisode ?? fallbackEpisode;

    if (!targetEpisode) return;

    setSelectedEpisode(targetEpisode);
    handleSaveToHistory(selectedDrama.id, targetEpisode.id);
  }, [
    selectedDrama,
    selectedEpisode,
    freeReelsEpisodes,
    historyByDramaId,
    handleSaveToHistory,
  ]);

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

    if (isNetshortSource(selectedSource)) {
      return liveNetshortDramas;
    }

    if (isFlickreelsSource(selectedSource)) {
      return liveFlickreelsDramas;
    }

    if (isShortmaxSource(selectedSource)) {
      return liveShortmaxDramas;
    }

    if (isGoodshortSource(selectedSource)) {
      return liveGoodshortDramas;
    }

    if (isIdramaSource(selectedSource)) {
      return liveIdramaDramas;
    }

    if (isReelifeSource(selectedSource)) {
      return liveReelifeDramas;
    }

    if (isFreeReelsSource(selectedSource)) {
      return liveFreeReelsDramas;
    }

    return visibleDramas;
  }, [
    selectedSource,
    liveDramaBoxDramas,
    liveReelShortDramas,
    liveMeloloDramas,
    liveDramawaveDramas,
    liveNetshortDramas,
    liveFlickreelsDramas,
    liveShortmaxDramas,
    liveGoodshortDramas,
    liveIdramaDramas,
    liveReelifeDramas,
    liveFreeReelsDramas,
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
    setDramawaveTab("Beranda");
    setNetshortTab("Beranda");
    setFlickreelsTab("Beranda");
    setShortmaxTab("Beranda");
    setShortmaxHasMorePages(true);

    setGoodshortTab("Beranda");
    setIdramaTab("Beranda");
    setDefaultSourceTab("Beranda");

    setMeloloOffset(0);
    setDramaBoxPage(1);
    setReelShortPage(1);
    setDramawavePage(1);
    setNetshortPage(1);
    setFlickreelsPage(1);
    setShortmaxPage(1);
    setShortmaxHasMorePages(true);
    setGoodshortPage(1);
    setIdramaPage(1);

    setLiveDramaBoxDramas([]);
    setDramaBoxFeedError(null);

    setLiveReelShortDramas([]);
    setReelShortFeedError(null);

    setLiveMeloloDramas([]);
    setMeloloFeedError(null);

    setLiveDramawaveDramas([]);
    setDramawaveFeedError(null);

    setLiveNetshortDramas([]);
    setNetshortFeedError(null);

    setLiveFlickreelsDramas([]);
    setFlickreelsFeedError(null);

    setLiveShortmaxDramas([]);
    setShortmaxFeedError(null);

    setLiveGoodshortDramas([]);
    setGoodshortFeedError(null);

    setLiveIdramaDramas([]);
    setIdramaFeedError(null);

    setReelShortEpisodes([]);
    setReelShortEpisodesError(null);
    setIsLoadingReelShortEpisodes(false);

    setMeloloEpisodes([]);
    setMeloloEpisodesError(null);
    setIsLoadingMeloloEpisodes(false);

    setDramawaveEpisodes([]);
    setDramawaveEpisodesError(null);
    setIsLoadingDramawaveEpisodes(false);

    setNetshortEpisodes([]);
    setNetshortEpisodesError(null);
    setIsLoadingNetshortEpisodes(false);

    setFlickreelsEpisodes([]);
    setFlickreelsEpisodesError(null);
    setIsLoadingFlickreelsEpisodes(false);

    setShortmaxEpisodes([]);
    setShortmaxEpisodesError(null);
    setIsLoadingShortmaxEpisodes(false);

    setGoodshortEpisodes([]);
    setGoodshortEpisodesError(null);
    setIsLoadingGoodshortEpisodes(false);

    setIdramaEpisodes([]);
    setIdramaEpisodesError(null);
    setIsLoadingIdramaEpisodes(false);
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

  const currentPagedHomePage = useMemo(() => {
    if (isDramaBoxSource(selectedSource)) return dramaBoxPage;
    if (isReelShortSource(selectedSource)) return reelShortPage;
    if (isDramawaveSource(selectedSource)) return dramawavePage;
    if (isNetshortSource(selectedSource)) return netshortPage;
    if (isFlickreelsSource(selectedSource)) return flickreelsPage;
    if (isShortmaxSource(selectedSource)) return shortmaxPage;
    if (isGoodshortSource(selectedSource)) return goodshortPage;
    if (isIdramaSource(selectedSource)) return idramaPage;
    return 1;
  }, [
    selectedSource,
    dramaBoxPage,
    reelShortPage,
    dramawavePage,
    netshortPage,
    flickreelsPage,
    shortmaxPage,
    goodshortPage,
    idramaPage,
  ]);

  const showGenericHomePagination = useMemo(() => {
    if (
      isShortmaxSource(selectedSource) &&
      submittedSearchQuery.trim().length === 0
    ) {
      const isAllowedShortmaxTab =
        activeSourceTab === "Beranda" ||
        activeSourceTab === "Terbaru" ||
        activeSourceTab === "Trending" ||
        activeSourceTab === "Hot";

      if (!isAllowedShortmaxTab) return false;

      if (activeSourceTab === "Terbaru") {
        return shortmaxPage > 1 || shortmaxHasMorePages;
      }

      return true;
    }

    return (
      !!selectedSource &&
      !isMeloloSource(selectedSource) &&
      submittedSearchQuery.trim().length === 0 &&
      ((isDramaBoxSource(selectedSource) && activeSourceTab === "Beranda") ||
        (isReelShortSource(selectedSource) && activeSourceTab === "Beranda") ||
        (isDramawaveSource(selectedSource) && activeSourceTab === "Beranda") ||
        (isNetshortSource(selectedSource) && activeSourceTab === "Beranda") ||
        (isFlickreelsSource(selectedSource) && activeSourceTab === "Beranda") ||
        (isGoodshortSource(selectedSource) &&
          (activeSourceTab === "Beranda" ||
            activeSourceTab === "Populer" ||
            activeSourceTab === "Trending" ||
            activeSourceTab === "Acak")) ||
        (isIdramaSource(selectedSource) &&
          (activeSourceTab === "Beranda" ||
            activeSourceTab === "Populer" ||
            activeSourceTab === "Hot" ||
            activeSourceTab === "Acak")))
    );
  }, [
    selectedSource,
    activeSourceTab,
    submittedSearchQuery,
    shortmaxPage,
    shortmaxHasMorePages,
  ]);

  const handleGenericPrevPage = useCallback(() => {
    if (isDramaBoxSource(selectedSource)) {
      setDramaBoxPage((current) => Math.max(1, current - 1));
      return;
    }

    if (isReelShortSource(selectedSource)) {
      setReelShortPage((current) => Math.max(1, current - 1));
      return;
    }

    if (isDramawaveSource(selectedSource)) {
      setDramawavePage((current) => Math.max(1, current - 1));
      return;
    }

    if (isNetshortSource(selectedSource)) {
      setNetshortPage((current) => Math.max(1, current - 1));
      return;
    }

    if (isFlickreelsSource(selectedSource)) {
      setFlickreelsPage((current) => Math.max(1, current - 1));
      return;
    }

    if (isShortmaxSource(selectedSource)) {
      setShortmaxPage((current) => Math.max(1, current - 1));
      return;
    }

    if (isGoodshortSource(selectedSource)) {
      setGoodshortPage((current) => Math.max(1, current - 1));
      return;
    }

    if (isIdramaSource(selectedSource)) {
      setIdramaPage((current) => Math.max(1, current - 1));
    }
  }, [selectedSource, activeSourceTab, shortmaxHasMorePages]);

  const handleGenericNextPage = useCallback(() => {
    if (isDramaBoxSource(selectedSource)) {
      setDramaBoxPage((current) => current + 1);
      return;
    }

    if (isReelShortSource(selectedSource)) {
      setReelShortPage((current) => current + 1);
      return;
    }

    if (isDramawaveSource(selectedSource)) {
      setDramawavePage((current) => current + 1);
      return;
    }

    if (isNetshortSource(selectedSource)) {
      setNetshortPage((current) => current + 1);
      return;
    }

    if (isFlickreelsSource(selectedSource)) {
      setFlickreelsPage((current) => current + 1);
      return;
    }

    if (isShortmaxSource(selectedSource)) {
      setShortmaxPage((current) => {
        if (activeSourceTab === "Terbaru" && !shortmaxHasMorePages) {
          return current;
        }
        return current + 1;
      });
      return;
    }

    if (isGoodshortSource(selectedSource)) {
      setGoodshortPage((current) => current + 1);
      return;
    }

    if (isIdramaSource(selectedSource)) {
      setIdramaPage((current) => current + 1);
    }
  }, [selectedSource, activeSourceTab, shortmaxHasMorePages]);

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

            if (isNetshortDrama(drama)) {
              cacheNetshortDrama(drama);
              setSelectedDrama(drama);
              setNetshortEpisodes([]);
              setSelectedEpisode(null);
              setNetshortEpisodesError(null);
              setShowEpisodes(false);
              setActiveTab("home");
              return;
            }

            if (isFlickreelsDrama(drama)) {
              cacheFlickreelsDrama(drama);
              setSelectedDrama(drama);
              setFlickreelsEpisodes([]);
              setSelectedEpisode(null);
              setFlickreelsEpisodesError(null);
              setShowEpisodes(false);
              setActiveTab("home");
              return;
            }

            if (isShortmaxDrama(drama)) {
              cacheShortmaxDrama(drama);
              setSelectedDrama(drama);
              setShortmaxEpisodes([]);
              setSelectedEpisode(null);
              setShortmaxEpisodesError(null);
              setShowEpisodes(false);
              setActiveTab("home");
              return;
            }

            if (isGoodshortDrama(drama)) {
              cacheGoodshortDrama(drama);
              setSelectedDrama(drama);
              setGoodshortEpisodes([]);
              setSelectedEpisode(null);
              setGoodshortEpisodesError(null);
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

            if (isNetshortDrama(drama)) {
              cacheNetshortDrama(drama);
              setSelectedDrama(drama);
              setNetshortEpisodes([]);
              setSelectedEpisode(null);
              setNetshortEpisodesError(null);
              setShowEpisodes(false);
              setActiveTab("home");
              return;
            }

            if (isFlickreelsDrama(drama)) {
              cacheFlickreelsDrama(drama);
              setSelectedDrama(drama);
              setFlickreelsEpisodes([]);
              setSelectedEpisode(null);
              setFlickreelsEpisodesError(null);
              setShowEpisodes(false);
              setActiveTab("home");
              return;
            }

            if (isShortmaxDrama(drama)) {
              cacheShortmaxDrama(drama);
              setSelectedDrama(drama);
              setShortmaxEpisodes([]);
              setSelectedEpisode(null);
              setShortmaxEpisodesError(null);
              setShowEpisodes(false);
              setActiveTab("home");
              return;
            }

            if (isGoodshortDrama(drama)) {
              cacheGoodshortDrama(drama);
              setSelectedDrama(drama);
              setGoodshortEpisodes([]);
              setSelectedEpisode(null);
              setGoodshortEpisodesError(null);
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
          onOpenMembershipInfo={() => {
            window.alert(
              "Status membership mengikuti bot Telegram. Jika status belum sesuai, silakan update lewat bot lalu buka ulang mini app.",
            );
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

  if (selectedDrama) {
    return (
      <>
        <PlayerScreen
          selectedDrama={selectedDrama}
          selectedEpisode={selectedEpisode}
          episodes={selectedDramaEpisodes}
          showEpisodes={showEpisodes}
          membershipStatus={membershipStatus}
          shouldShowAds={shouldShowAds}
          adCampaign={resolvedAdCampaign}
          onSkipAd={trackAdSkip}
          onCompleteAd={trackAdComplete}
          onClickAdCta={trackAdClick}
          isLoadingEpisodes={
            isDramaBoxDrama(selectedDrama)
              ? isLoadingDramaBoxEpisodes
              : isReelShortDrama(selectedDrama)
                ? isLoadingReelShortEpisodes
                : isMeloloDrama(selectedDrama)
                  ? isLoadingMeloloEpisodes
                  : isDramawaveDrama(selectedDrama)
                    ? isLoadingDramawaveEpisodes
                    : isNetshortDrama(selectedDrama)
                      ? isLoadingNetshortEpisodes
                      : isFlickreelsDrama(selectedDrama)
                        ? isLoadingFlickreelsEpisodes
                        : isShortmaxDrama(selectedDrama)
                          ? isLoadingShortmaxEpisodes
                          : isGoodshortDrama(selectedDrama)
                            ? isLoadingGoodshortEpisodes
                            : isIdramaDrama(selectedDrama)
                              ? isLoadingIdramaEpisodes
                              : isReelifeDrama(selectedDrama)
                                ? isLoadingReelifeEpisodes
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
                    : isNetshortDrama(selectedDrama)
                      ? netshortEpisodesError
                      : isFlickreelsDrama(selectedDrama)
                        ? flickreelsEpisodesError
                        : isShortmaxDrama(selectedDrama)
                          ? shortmaxEpisodesError
                          : isGoodshortDrama(selectedDrama)
                            ? goodshortEpisodesError
                            : isIdramaDrama(selectedDrama)
                              ? idramaEpisodesError
                              : isReelifeDrama(selectedDrama)
                                ? reelifeEpisodesError
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
            setNetshortEpisodes([]);
            setNetshortEpisodesError(null);
            setFlickreelsEpisodes([]);
            setFlickreelsEpisodesError(null);
            setShortmaxEpisodes([]);
            setShortmaxEpisodesError(null);
            setGoodshortEpisodes([]);
            setGoodshortEpisodesError(null);
            setIdramaEpisodes([]);
            setIdramaEpisodesError(null);
            setReelifeEpisodes([]);
            setReelifeEpisodesError(null);
            setFreeReelsEpisodes([]);
            setFreeReelsEpisodesError(null);
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
          sourceTab={
            activeSourceTab as React.ComponentProps<
              typeof SourceScreen
            >["sourceTab"]
          }
          filteredDramas={sourceScreenDramas}
          favoriteIds={favoriteIds}
          isTelegramReady={isTelegramWebAppReady}
          dramaBoxPage={dramaBoxPage}
          dramaBoxHasNextPage={dramaBoxHasNextPage}
          showDramaBoxPagination={
            isDramaBoxSource(selectedSource) &&
            submittedSearchQuery.trim().length === 0 &&
            (dramaBoxTab === "Beranda" ||
              dramaBoxTab === "Terbaru" ||
              dramaBoxTab === "Dubbing" ||
              dramaBoxTab === "Acak")
          }
          onDramaBoxPrevPage={handleDramaBoxPrevPage}
          onDramaBoxNextPage={handleDramaBoxNextPage}
          reelifePage={reelifePage}
          reelifeHasNextPage={reelifeHasNextPage}
          showReelifePagination={
            isReelifeSource(selectedSource) &&
            submittedSearchQuery.trim().length === 0 &&
            (reelifeTab === "Beranda" ||
              reelifeTab === "Trending" ||
              reelifeTab === "Hot" ||
              reelifeTab === "Acak")
          }
          onReelifePrevPage={handleReelifePrevPage}
          onReelifeNextPage={handleReelifeNextPage}
          isSearchEnabled={
            isDramaBoxSource(selectedSource) ||
            isReelShortSource(selectedSource) ||
            isMeloloSource(selectedSource) ||
            isDramawaveSource(selectedSource) ||
            isNetshortSource(selectedSource) ||
            isFlickreelsSource(selectedSource) ||
            isShortmaxSource(selectedSource) ||
            isGoodshortSource(selectedSource) ||
            isIdramaSource(selectedSource) ||
            isReelifeSource(selectedSource) ||
            isFreeReelsSource(selectedSource)
          }
          meloloPage={Math.floor(meloloOffset / 20) + 1}
          meloloHasNextPage={meloloHasNextPage}
          showMeloloPagination={
            isMeloloSource(selectedSource) &&
            submittedSearchQuery.trim().length === 0 &&
            (meloloTab === "Beranda" ||
              meloloTab === "Terbaru" ||
              meloloTab === "ForYou" ||
              meloloTab === "Trending")
          }
          onMeloloPrevPage={() =>
            setMeloloOffset((prev) => Math.max(0, prev - 20))
          }
          onMeloloNextPage={() => setMeloloOffset((prev) => prev + 20)}
          flickreelsPage={flickreelsPage}
          showFlickreelsPagination={false}
          onFlickreelsPrevPage={() =>
            setFlickreelsPage((prev) => Math.max(1, prev - 1))
          }
          onFlickreelsNextPage={() => setFlickreelsPage((prev) => prev + 1)}
          shortmaxPage={shortmaxPage}
          showShortmaxPagination={false}
          onShortmaxPrevPage={() =>
            setShortmaxPage((prev) => Math.max(1, prev - 1))
          }
          onShortmaxNextPage={() => setShortmaxPage((prev) => prev + 1)}
          goodshortPage={goodshortPage}
          goodshortHasNextPage={goodshortHasNextPage}
          showGoodshortPagination={
            isGoodshortSource(selectedSource) &&
            submittedSearchQuery.trim().length === 0 &&
            goodshortTab !== "Trending"
          }
          onGoodshortPrevPage={handleGoodshortPrevPage}
          onGoodshortNextPage={handleGoodshortNextPage}
          onBack={() => {
            setSelectedSource(null);
            setSubmittedSearchQuery("");
            setSearchQuery("");
            setDramaBoxPage(1);
            setReelShortPage(1);
            setMeloloOffset(0);
            setDramawavePage(1);
            setNetshortPage(1);
            setFlickreelsPage(1);
            setShortmaxPage(1);
            setShortmaxHasMorePages(true);
            setGoodshortPage(1);
            setIdramaPage(1);
            setDramaBoxTab("Beranda");
            setReelShortTab("Beranda");
            setMeloloTab("Beranda");
            setDramawaveTab("Beranda");
            setNetshortTab("Beranda");
            setFlickreelsTab("Beranda");
            setShortmaxTab("Beranda");
            setShortmaxHasMorePages(true);

            setGoodshortTab("Beranda");
            setIdramaTab("Beranda");
            setLiveDramaBoxDramas([]);
            setDramaBoxFeedError(null);
            setLiveReelShortDramas([]);
            setReelShortFeedError(null);
            setLiveMeloloDramas([]);
            setMeloloFeedError(null);
            setLiveDramawaveDramas([]);
            setDramawaveFeedError(null);
            setLiveNetshortDramas([]);
            setNetshortFeedError(null);
            setLiveFlickreelsDramas([]);
            setFlickreelsFeedError(null);
            setLiveShortmaxDramas([]);
            setShortmaxFeedError(null);
            setLiveGoodshortDramas([]);
            setGoodshortFeedError(null);
            setLiveIdramaDramas([]);
            setIdramaFeedError(null);
            setLiveReelifeDramas([]);
            setReelifeFeedError(null);
          }}
          onSearchChange={setSearchQuery}
          onSubmitSearch={handleSubmitSearch}
          onTabChange={handleSourceTabChange}
          onSelectDrama={(drama) => {
            setSelectedDrama(drama);
            setSelectedEpisode(null);
            setShowEpisodes(false);
          }}
          onToggleFavorite={handleToggleFavorite}
        />
        {showGenericHomePagination ? (
          <div className="fixed bottom-24 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-[#12131A]/95 px-3 py-2 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur">
            <button
              type="button"
              onClick={handleGenericPrevPage}
              disabled={currentPagedHomePage <= 1}
              className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Prev
            </button>

            <span className="min-w-[62px] text-center text-sm font-medium text-[#E6D3A3]">
              Page {currentPagedHomePage}
            </span>

            <button
              type="button"
              onClick={handleGenericNextPage}
              className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white"
            >
              Next →
            </button>
          </div>
        ) : null}

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
          setDramaBoxPage(1);
          setReelShortPage(1);
          setDramawavePage(1);
          setNetshortPage(1);
          setFlickreelsPage(1);
          setShortmaxPage(1);
          setDramawaveTab("Beranda");
          setNetshortTab("Beranda");
          setFlickreelsTab("Beranda");
          setShortmaxTab("Beranda");
          setDefaultSourceTab("Beranda");
          setLiveDramaBoxDramas([]);
          setDramaBoxFeedError(null);
          setLiveReelShortDramas([]);
          setReelShortFeedError(null);
          setLiveMeloloDramas([]);
          setMeloloFeedError(null);
          setLiveDramawaveDramas([]);
          setDramawaveFeedError(null);
          setLiveNetshortDramas([]);
          setNetshortFeedError(null);
          setLiveFlickreelsDramas([]);
          setFlickreelsFeedError(null);
          setLiveShortmaxDramas([]);
          setShortmaxFeedError(null);
          setDramaBoxEpisodes([]);
          setDramaBoxEpisodesError(null);
          setReelShortEpisodes([]);
          setReelShortEpisodesError(null);
          setMeloloEpisodes([]);
          setMeloloEpisodesError(null);
          setDramawaveEpisodes([]);
          setDramawaveEpisodesError(null);
          setNetshortEpisodes([]);
          setNetshortEpisodesError(null);
          setFlickreelsEpisodes([]);
          setFlickreelsEpisodesError(null);
          setShortmaxEpisodes([]);
          setShortmaxEpisodesError(null);
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
