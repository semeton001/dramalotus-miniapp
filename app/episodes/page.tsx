import Link from "next/link";
import { requireUser } from "@/lib/auth/requireUser";
import { canUserAccessEpisode, FREE_EPISODE_LIMIT } from "@/lib/episodes/access";
import { supabaseServer } from "@/lib/supabase/server";
import type { Episode } from "@/types/episode";

async function getEpisodes(): Promise<Episode[]> {
  const { data, error } = await supabaseServer
    .from("episodes")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => ({
    id: Number(item.id),
    dramaId: Number(item.drama_id),
    episodeNumber: item.episode_number,
    title: item.title,
    duration: item.duration ?? "",
    slug: item.slug,
    description: item.description ?? undefined,
    sortOrder: item.sort_order ?? undefined,
    isLocked: item.is_locked,
    isVipOnly: item.is_vip_only,
    videoUrl: item.video_url ?? undefined,
    thumbnail: item.thumbnail ?? undefined,
  })) as Episode[];
}

export default async function EpisodesPage() {
  const user = await requireUser();
  const episodes = await getEpisodes();

  return (
    <main style={{ padding: 24, maxWidth: 980 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ marginBottom: 8 }}>Episodes</h1>
        <p style={{ opacity: 0.8, margin: 0 }}>
          Member FREE bisa akses episode 1-{FREE_EPISODE_LIMIT}. Member VIP bisa akses semua episode.
        </p>
      </div>

      <section
        style={{
          border: "1px solid #333",
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14 }}>Membership aktif:</span>
          <span
            style={{
              display: "inline-block",
              padding: "4px 10px",
              borderRadius: 999,
              border: "1px solid #444",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {user.membership_status === "vip" ? "VIP" : "FREE"}
          </span>

          {user.membership_status === "free" ? (
            <Link
              href="/upgrade"
              style={{ textDecoration: "none", color: "inherit", fontSize: 14 }}
            >
              Upgrade VIP
            </Link>
          ) : null}
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {episodes.map((episode) => {
          const canAccess = canUserAccessEpisode(user, episode);
          const isLocked = !canAccess;

          return (
            <article
              key={episode.id}
              style={{
                border: "1px solid #333",
                borderRadius: 12,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
                Episode {episode.episodeNumber}
              </div>

              <h2 style={{ fontSize: 20, marginTop: 0, marginBottom: 8 }}>
                {episode.title}
              </h2>

              <p style={{ minHeight: 42, opacity: 0.8 }}>
                {episode.description || "Episode siap ditonton."}
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: "1px solid #444",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {isLocked ? "VIP ONLY" : "OPEN"}
                </span>

                {episode.duration ? (
                  <span style={{ fontSize: 12, opacity: 0.75 }}>
                    {episode.duration}
                  </span>
                ) : null}
              </div>

              {isLocked ? (
                <Link
                  href={`/upgrade?from=episode-${episode.episodeNumber}`}
                  style={{
                    display: "inline-block",
                    textDecoration: "none",
                    color: "inherit",
                    border: "1px solid #444",
                    borderRadius: 10,
                    padding: "10px 14px",
                  }}
                >
                  Upgrade untuk buka
                </Link>
              ) : (
                <Link
                  href={`/episodes/${encodeURIComponent(episode.slug || String(episode.id))}`}
                  style={{
                    display: "inline-block",
                    textDecoration: "none",
                    color: "inherit",
                    border: "1px solid #444",
                    borderRadius: 10,
                    padding: "10px 14px",
                  }}
                >
                  Watch Episode
                </Link>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
