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

export default function Home() {
  const [sources, setSources] = useState<Source[]>([]);
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

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

        if (!isMounted) return;

        setSources(sourcesData);
        setDramas(dramasData);
        setEpisodes(episodesData);
      } catch (error) {
        console.error("Gagal memuat data:", error);

        if (!isMounted) return;
        setSources([]);
        setDramas([]);
        setEpisodes([]);
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

  const toggleFavorite = (dramaId: number) => {
    setFavoriteIds((prev) =>
      prev.includes(dramaId)
        ? prev.filter((id) => id !== dramaId)
        : [...prev, dramaId],
    );
  };

  const favoriteDramas = dramas.filter((drama) =>
    favoriteIds.includes(drama.id),
  );

  const currentEpisodes = selectedDrama
    ? episodes.filter((episode) => episode.dramaId === selectedDrama.id)
    : [];

  const saveToHistory = (dramaId: number, episodeId: number) => {
    setHistoryItems((prev) => {
      const filtered = prev.filter((item) => item.dramaId !== dramaId);
      return [{ dramaId, episodeId }, ...filtered];
    });
  };

  if (showSplash) {
    return (
      <main className="min-h-screen bg-[#050507] text-[#F5F1E8]">
        <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
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
      <main className="min-h-screen bg-[#050507] text-[#F5F1E8]">
        <div className="mx-auto flex min-h-screen w-full max-w-md items-center justify-center px-6">
          <div className="rounded-[28px] border border-white/10 bg-[#12131A] px-6 py-5 text-center shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
            <p className="text-sm text-[#8F887C]">Memuat katalog drama...</p>
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
          setActiveTab("home");
        }}
      />
    );
  }

  if (activeTab === "profile" && !selectedSource && !selectedDrama) {
    return (
      <ProfileScreen
        favoriteCount={favoriteDramas.length}
        membershipStatus={membershipStatus}
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
