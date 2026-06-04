import { NextRequest, NextResponse } from "next/server";
import { pinedramaFetch } from "../_shared";

export async function GET(req: NextRequest) {
  try {
    const collectionId =
      req.nextUrl.searchParams.get("collectionId")?.trim() ||
      req.nextUrl.searchParams.get("collection_id")?.trim() ||
      "";

    if (!collectionId) {
      return NextResponse.json(
        { error: "collectionId is required" },
        { status: 400 },
      );
    }

    const qs = new URLSearchParams({
      collection_id: collectionId,
      language: "id",
      region: "ID",
    });

    const payload = await pinedramaFetch<any>(
      `/api/drama/episodes?${qs.toString()}`
    );

    const episodes =
      payload?.data?.episodes || [];

    const mapped = episodes.map(
      (episode: any, index: number) => ({
        id:
          Number(episode.seqId) ||
          index + 1,

        dramaId: collectionId,

        episodeNumber:
          Number(episode.num) ||
          index + 1,

        title:
          `Episode ${
            Number(episode.num) ||
            index + 1
          }`,

        duration: "",
        description: "",

        videoUrl:
          `/api/pinedrama/stream?collectionId=${encodeURIComponent(collectionId)}&episode=${encodeURIComponent(String(episode.num))}`,

        subtitleUrl:
          `/api/pinedrama/subtitle?collectionId=${encodeURIComponent(collectionId)}&episode=${encodeURIComponent(String(episode.num))}`,

        subtitleLang: "id",
        subtitleLabel: "Indonesia",

        isLocked: false,
        isVipOnly: false,

        pinedramaVideoId:
          episode.videoId,

        pinedramaSeqId:
          episode.seqId,
      }),
    );

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Episodes failed",
      },
      { status: 500 },
    );
  }
}
