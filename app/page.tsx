"use client";

import { useEffect, useMemo, useState } from "react";
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

type SafeTelegramUser = {
  id: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
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

export default function Home() {
  const FAVORITES_STORAGE_KEY = "dramalotus.favoriteIds";
  const HISTORY_STORAGE_KEY = "dramalotus.historyItems";
  const MEMBERSHIP_STORAGE_KEY = "dramalotus.membershipStatus";

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
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [selectedDrama, setSelectedDrama] = useState<Drama | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "home" | "history" | "favorites" | "profile"
  >("home");
  const [sourceTab, setSourceTab] = useState<
    "Beranda" | "Terbaru" | "Dubbing" | "Acak"
  >("Beranda");

  const [searchQuery, setSearchQuery] = useState("");
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [historyItems, setHistoryItems] = useState<
    { dramaId: number; episodeId: number }[]
  >([]);
  const [membershipStatus, setMembershipStatus] = useState<"free" | "vip">(
    "free",
  );
  const [showSplash, setShowSplash] = useState(true);
  // Mode app:
  // - Browser biasa / luar Telegram -> lokal saja
  // - Telegram ada tapi user tidak valid -> lokal/netral
  // - Telegram valid -> boleh sync profile/favorit/riwayat
  const canUseTelegramSync = isTelegramWebAppReady && isTelegramUserValid;

  useEffect(() => {
    if (!showSplash) return;

    const timer = setTimeout(
      () => {
        setShowSplash(false);
      },
      membershipStatus === "vip" ? 1200 : 2200,
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
    setTelegramUserName(
      validatedUser.username ||
        [validatedUser.firstName, validatedUser.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        null,
    );
    setIsTelegramUserValid(true);
  }, []);

  useEffect(() => {
    if (canUseTelegramSync) return;

    setTelegramUserId(null);
    setTelegramUserName(null);
    setIsTelegramUserValid(false);
    setHasSyncedProfile(false);
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
          setFavoriteIds(parsed.filter((id) => typeof id === "number"));
        }
      }
    } catch (error) {
      console.error("Gagal membaca favorit:", error);
    }
  }, []);

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
    try {
      const storedHistoryItems =
        window.localStorage.getItem(HISTORY_STORAGE_KEY);

      if (storedHistoryItems) {
        const parsed = JSON.parse(storedHistoryItems);

        if (Array.isArray(parsed)) {
          setHistoryItems(
            parsed.filter(
              (item) =>
                item &&
                typeof item === "object" &&
                typeof item.dramaId === "number" &&
                typeof item.episodeId === "number",
            ),
          );
        }
      }
      setHasLoadedServerHistory(true);
    } catch (error) {
      console.error("Gagal membaca riwayat:", error);
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
      window.localStorage.setItem(MEMBERSHIP_STORAGE_KEY, membershipStatus);
    } catch (error) {
      console.error("Gagal menyimpan membership:", error);
    }
  }, [membershipStatus]);

  useEffect(() => {
    setHasSyncedProfile(false);
  }, [telegramUserId]);

  useEffect(() => {
    if (!canUseTelegramSync || !telegramUserId || hasLoadedServerFavorites)
      return;

    const syncProfile = async () => {
      try {
        await fetch("/api/user-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            telegram_user_id: telegramUserId,
            telegram_username: telegramUserName,
          }),
        });
      } catch (error) {
        console.error("Gagal sync user profile:", error);
      }
    };

    syncProfile();
  }, [canUseTelegramSync, telegramUserId, telegramUserName]);

  useEffect(() => {
    if (!canUseTelegramSync || !telegramUserId || hasLoadedServerFavorites)
      return;

    let isMounted = true;

    const loadServerFavorites = async () => {
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
          setFavoriteIds(data.filter((id) => typeof id === "number"));
        }

        setHasLoadedServerFavorites(true);
      } catch (error) {
        console.error("Gagal memuat favorit server:", error);
      }
    };

    loadServerFavorites();

    return () => {
      isMounted = false;
    };
  }, [canUseTelegramSync, telegramUserId, hasLoadedServerFavorites]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [sourcesRes, dramasRes, episodesRes] = await Promise.all([
          fetch("/api/sources"),
          fetch("/api/dramas"),
          fetch("/api/episodes"),
        ]);

        if (!sourcesRes.ok || !dramasRes.ok || !episodesRes.ok) {
          throw new Error("Gagal memuat data endpoint lokal.");
        }

        const [sourcesData, dramasData, episodesData] = await Promise.all([
          sourcesRes.json(),
          dramasRes.json(),
          episodesRes.json(),
        ]);

        if (!isArray<Source>(sourcesData)) {
          throw new Error("Format data sources tidak valid.");
        }

        if (!isArray<Drama>(dramasData)) {
          throw new Error("Format data dramas tidak valid.");
        }

        if (!isArray<Episode>(episodesData)) {
          throw new Error("Format data episodes tidak valid.");
        }

        if (!isMounted) return;

        setSources(sourcesData);
        setDramas(dramasData);
        setEpisodes(episodesData);
        setDataError(null);
      } catch (error) {
        console.error("Gagal memuat data:", error);

        if (!isMounted) return;

        setSources([]);
        setDramas([]);
        setEpisodes([]);
        setDataError(
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat katalog drama.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const filteredDramas = useMemo(() => {
    const keyword = searchQuery.toLowerCase().trim();

    const baseFiltered = dramas.filter((drama) => {
      const matchesSource = selectedSource
        ? drama.source === selectedSource.name
        : true;

      const matchesSearch =
        keyword.length === 0 ||
        drama.title.toLowerCase().includes(keyword) ||
        drama.tags.some((tag) => tag.toLowerCase().includes(keyword)) ||
        drama.description?.toLowerCase().includes(keyword);

      return matchesSource && matchesSearch;
    });

    if (sourceTab === "Terbaru") {
      return baseFiltered.filter((drama) => drama.isNew);
    }

    if (sourceTab === "Dubbing") {
      return baseFiltered.filter((drama) => drama.isDubbed);
    }

    if (sourceTab === "Acak") {
      return [...baseFiltered].sort(() => Math.random() - 0.5);
    }

    return [...baseFiltered].sort((a, b) => {
      const aOrder = a.sortOrder ?? 9999;
      const bOrder = b.sortOrder ?? 9999;
      return aOrder - bOrder;
    });
  }, [dramas, selectedSource, searchQuery, sourceTab]);

  const toggleFavorite = async (dramaId: number) => {
    const isFavorited = favoriteIds.includes(dramaId);

    setFavoriteIds((prev) =>
      isFavorited ? prev.filter((id) => id !== dramaId) : [...prev, dramaId],
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

      setFavoriteIds((prev) =>
        isFavorited ? [...prev, dramaId] : prev.filter((id) => id !== dramaId),
      );
    }
  };

  const favoriteDramas = dramas.filter((drama) =>
    favoriteIds.includes(drama.id),
  );

  const mostWatchedLabel = useMemo(() => {
    if (historyItems.length === 0) return "-";

    const dramaMap = new Map(dramas.map((drama) => [drama.id, drama]));
    const sourceCount = new Map<string, number>();

    historyItems.forEach((item) => {
      const drama = dramaMap.get(item.dramaId);
      if (!drama?.source) return;

      sourceCount.set(drama.source, (sourceCount.get(drama.source) ?? 0) + 1);
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
  }, [historyItems, dramas]);

  const currentEpisodes = selectedDrama
    ? episodes.filter((episode) => episode.dramaId === selectedDrama.id)
    : [];

  const saveToHistory = async (dramaId: number, episodeId: number) => {
    const previousHistoryItems = historyItems;

    setHistoryItems((prev) => {
      const filtered = prev.filter((item) => item.dramaId !== dramaId);
      return [{ dramaId, episodeId }, ...filtered];
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
  };

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
      <HistoryScreen
        dramas={dramas}
        episodes={episodes}
        historyItems={historyItems}
        onBack={() => setActiveTab("home")}
        onOpenFavorites={() => setActiveTab("favorites")}
        onOpenProfile={() => setActiveTab("profile")}
        onSelectDrama={(drama, episode) => {
          setSelectedDrama(drama);
          setSelectedEpisode(episode);
          setActiveTab("home");
        }}
      />
    );
  }

  if (activeTab === "favorites" && !selectedSource && !selectedDrama) {
    return (
      <FavoritesScreen
        favoriteDramas={favoriteDramas}
        onBack={() => setActiveTab("home")}
        onOpenHistory={() => setActiveTab("history")}
        onOpenProfile={() => setActiveTab("profile")}
        onSelectDrama={(drama) => {
          setSelectedDrama(drama);

          const firstEpisode =
            episodes.find((episode) => episode.dramaId === drama.id) ?? null;

          setSelectedEpisode(firstEpisode);

          if (firstEpisode) {
            saveToHistory(drama.id, firstEpisode.id);
          }

          setActiveTab("home");
        }}
      />
    );
  }

  if (activeTab === "profile" && !selectedSource && !selectedDrama) {
    return (
      <ProfileScreen
        favoriteCount={favoriteDramas.length}
        historyCount={historyItems.length}
        mostWatchedLabel={mostWatchedLabel}
        membershipStatus={membershipStatus}
        telegramUserName={telegramUserName}
        telegramUserId={telegramUserId}
        onBack={() => setActiveTab("home")}
        onOpenHistory={() => setActiveTab("history")}
        onOpenFavorites={() => setActiveTab("favorites")}
        onToggleMembership={() =>
          setMembershipStatus((prev) => (prev === "free" ? "vip" : "free"))
        }
      />
    );
  }

  if (selectedDrama) {
    return (
      <PlayerScreen
        selectedDrama={selectedDrama}
        selectedEpisode={selectedEpisode}
        episodes={currentEpisodes}
        showEpisodes={showEpisodes}
        membershipStatus={membershipStatus}
        onBack={() => {
          setSelectedDrama(null);
          setSelectedEpisode(null);
          setShowEpisodes(false);
        }}
        onOpenEpisodes={() => setShowEpisodes(true)}
        onCloseEpisodes={() => setShowEpisodes(false)}
        onSelectEpisode={(episode) => {
          setSelectedEpisode(episode);

          if (selectedDrama) {
            saveToHistory(selectedDrama.id, episode.id);
          }
        }}
      />
    );
  }

  if (selectedSource) {
    return (
      <SourceScreen
        selectedSource={selectedSource}
        searchQuery={searchQuery}
        sourceTab={sourceTab}
        filteredDramas={filteredDramas}
        favoriteIds={favoriteIds}
        isTelegramReady={canUseTelegramSync}
        onBack={() => {
          setSelectedSource(null);
          setSearchQuery("");
          setSourceTab("Beranda");
        }}
        onSearchChange={setSearchQuery}
        onTabChange={setSourceTab}
        onSelectDrama={(drama) => {
          setSelectedDrama(drama);
          const firstEpisode =
            episodes.find((episode) => episode.dramaId === drama.id) ?? null;
          setSelectedEpisode(firstEpisode);

          if (firstEpisode) {
            saveToHistory(drama.id, firstEpisode.id);
          }
        }}
        onToggleFavorite={toggleFavorite}
      />
    );
  }

  return (
    <HomeScreen
      popularSources={popularSources}
      otherSources={otherSources}
      onSelectSource={(source) => {
        setSelectedSource(source);
        setSearchQuery("");
        setSourceTab("Beranda");
      }}
      onOpenHistory={() => setActiveTab("history")}
      onOpenFavorites={() => setActiveTab("favorites")}
      onOpenProfile={() => setActiveTab("profile")}
    />
  );
}
