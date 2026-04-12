import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { canUserAccessEpisode, FREE_EPISODE_LIMIT } from "@/lib/episodes/access";
import { supabaseServer } from "@/lib/supabase/server";
import type { Episode } from "@/types/episode";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

async function getEpisodeBySlug(slug: string): Promise<Episode | null> {
  const { data, error } = await supabaseServer
    .from("episodes")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    id: Number(data.id),
    dramaId: Number(data.drama_id),
    episodeNumber: data.episode_number,
    title: data.title,
    duration: data.duration ?? "",
    slug: data.slug,
    description: data.description ?? undefined,
    sortOrder: data.sort_order ?? undefined,
    isLocked: data.is_locked,
    isVipOnly: data.is_vip_only,
    videoUrl: data.video_url ?? undefined,
    thumbnail: data.thumbnail ?? undefined,
    originalVideoUrl: data.original_video_url ?? undefined,
    subtitleUrl: data.subtitle_url ?? undefined,
    subtitleLang: data.subtitle_lang ?? undefined,
    subtitleLabel: data.subtitle_label ?? undefined,
  } as Episode;
}

export default async function EpisodeDetailPage({ params }: Params) {
  const user = await requireUser();
  const resolvedParams = await params;
  const episode = await getEpisodeBySlug(decodeURIComponent(resolvedParams.slug));

  if (!episode) {
    notFound();
  }

  const canAccess = canUserAccessEpisode(user, episode);

  if (!canAccess) {
    redirect(`/upgrade?from=episode-${episode.episodeNumber}`);
  }

  return (
    <main style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/episodes"
          style={{ textDecoration: "none", color: "inherit", fontSize: 14 }}
        >
          ← Back to Episodes
        </Link>
      </div>

      <section
        style={{
          border: "1px solid #333",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
          Episode {episode.episodeNumber}
        </div>

        <h1 style={{ marginTop: 0, marginBottom: 12 }}>{episode.title}</h1>

        <p style={{ opacity: 0.85, marginBottom: 16 }}>
          {episode.description || "Episode siap ditonton."}
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
            {user.membership_status === "vip" ? "VIP ACCESS" : `FREE ACCESS 1-${FREE_EPISODE_LIMIT}`}
          </span>

          {episode.duration ? (
            <span
              style={{
                display: "inline-block",
                padding: "4px 10px",
                borderRadius: 999,
                border: "1px solid #444",
                fontSize: 12,
              }}
            >
              {episode.duration}
            </span>
          ) : null}
        </div>
      </section>

      <section
        style={{
          border: "1px solid #333",
          borderRadius: 12,
          padding: 20,
          marginBottom: 20,
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Video</h2>

        {episode.videoUrl ? (
          <video
            controls
            playsInline
            preload="metadata"
            style={{
              width: "100%",
              borderRadius: 12,
              background: "#000",
            }}
            src={episode.videoUrl}
          >
            {episode.subtitleUrl ? (
              <track
                kind="subtitles"
                srcLang={episode.subtitleLang || "id"}
                label={episode.subtitleLabel || "Indonesian"}
                src={episode.subtitleUrl}
                default
              />
            ) : null}
          </video>
        ) : (
          <div
            style={{
              border: "1px dashed #444",
              borderRadius: 12,
              padding: 20,
              opacity: 0.8,
            }}
          >
            Video URL belum tersedia untuk episode ini.
          </div>
        )}
      </section>
    </main>
  );
}
