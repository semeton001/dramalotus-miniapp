import { NextRequest, NextResponse } from "next/server";
import { adaptMeloloEpisodeList } from "@/lib/adapters/episode/melolo";

const MELOLO_VIDEO_CODE = "4D96F22760EA30FB0FFBA9AA87A979A6";

function buildDetailUrl(id: string): string {
  return `https://melolo.dramabos.my.id/api/detail/${encodeURIComponent(id)}?lang=id`;
}

function buildVideoUrl(vid: string): string {
  return `https://melolo.dramabos.my.id/api/video/${encodeURIComponent(vid)}?lang=id&code=${MELOLO_VIDEO_CODE}`;
}

function createStableNumericId(seed: string, fallback = 0): number {
  if (!seed.trim()) return fallback;

  let value = 7;
  for (const ch of seed) {
    value = (value * 31 + ch.charCodeAt(0)) % 2147483647;
  }

  return value > 0 ? value : fallback;
}

type StreamPayload = {
  url?: string;
  backup?: string;
  list?: Array<{
    definition?: string;
    url?: string;
  }>;
  [key: string]: unknown;
};

type EpisodeWithMeloloMeta = {
  meloloVid?: string;
  videoUrl?: string;
  [key: string]: unknown;
};

function pickBestStreamUrl(payload: StreamPayload): string {
  if (typeof payload.url === "string" && payload.url.trim().length > 0) {
    return payload.url.trim();
  }

  if (Array.isArray(payload.list) && payload.list.length > 0) {
    const firstValid = payload.list.find(
      (item) => typeof item?.url === "string" && item.url.trim().length > 0,
    );

    if (firstValid?.url) {
      return firstValid.url.trim();
    }
  }

  if (typeof payload.backup === "string" && payload.backup.trim().length > 0) {
    return payload.backup.trim();
  }

  return "";
}

async function resolveMeloloStreamUrl(vid: string): Promise<string> {
  if (!vid.trim()) return "";

  const url = buildVideoUrl(vid);

  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `Melolo video upstream failed. vid=${vid} status=${response.status} url=${url}`,
      );
      return "";
    }

    const payload = (await response.json()) as StreamPayload;
    return pickBestStreamUrl(payload);
  } catch (error) {
    console.error(`Failed to resolve Melolo video url. vid=${vid} url=${url}`, error);
    return "";
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const meloloDramaId = searchParams.get("dramaId")?.trim() ?? "";

    if (!meloloDramaId) {
      return NextResponse.json(
        { error: "Missing Melolo dramaId" },
        { status: 400 },
      );
    }

    const detailResponse = await fetch(buildDetailUrl(meloloDramaId), {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!detailResponse.ok) {
      return NextResponse.json(
        {
          error: `Melolo episodes upstream failed with status ${detailResponse.status}`,
        },
        { status: detailResponse.status },
      );
    }

    const detailPayload = await detailResponse.json();

    const adaptedEpisodes = adaptMeloloEpisodeList(detailPayload, {
      dramaId: createStableNumericId(meloloDramaId, 1),
      meloloDramaId,
    });

    const hydratedEpisodes = await Promise.all(
      adaptedEpisodes.map(async (episode) => {
        const typedEpisode = episode as EpisodeWithMeloloMeta;
        const vid =
          typeof typedEpisode.meloloVid === "string"
            ? typedEpisode.meloloVid.trim()
            : "";

        if (!vid) {
          return {
            ...episode,
            videoUrl: episode.videoUrl || "",
          };
        }

        const resolvedUrl = await resolveMeloloStreamUrl(vid);

        return {
          ...episode,
          videoUrl: resolvedUrl || episode.videoUrl || "",
        };
      }),
    );

    console.log(
      "Melolo hydrated episodes preview:",
      hydratedEpisodes.slice(0, 2).map((item) => ({
        episodeNumber: item.episodeNumber,
        title: item.title,
        hasVideoUrl: !!item.videoUrl,
      })),
    );

    return NextResponse.json(hydratedEpisodes, { status: 200 });
  } catch (error) {
    console.error("Melolo episodes route error:", error);

    return NextResponse.json(
      { error: "Failed to load Melolo episodes" },
      { status: 500 },
    );
  }
}