import { NextRequest, NextResponse } from "next/server";
import {
  createStableNumericId,
  reelifeFetch,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const dramaId =
      request.nextUrl.searchParams.get("dramaId")?.trim() || "";

    if (!dramaId) {
      return NextResponse.json(
        { error: "Missing dramaId" },
        { status: 400 },
      );
    }

    const payload: any =
      await reelifeFetch(
        `/dramas/${encodeURIComponent(dramaId)}/chapters`,
      );

    const chapterList =
      payload?.data?.chapterList || [];

    const numericDramaId =
      createStableNumericId(dramaId);

    const episodes = chapterList.map(
      (chapter: any, index: number) => {
        const episodeNumber = index + 1;

        return {
          id: createStableNumericId(
            `${dramaId}-${chapter.chapterId}`,
            episodeNumber,
          ),
          dramaId: numericDramaId,
          episodeNumber,
          title: `Episode ${episodeNumber}`,
          videoUrl:
            `/api/reelife/stream?miniapp=1&dramaId=${encodeURIComponent(dramaId)}&episode=${encodeURIComponent(chapter.chapterId)}`,
          originalVideoUrl: "",
          isLocked: false,
          isVipOnly: false,
          sortOrder: episodeNumber,
          reelifeEpisodeId: String(
            chapter.chapterId || episodeNumber,
          ),
        };
      },
    );

    return NextResponse.json(episodes);
  } catch (error) {
    console.error("Reelife episodes route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown Reelife episodes error",
      },
      { status: 500 },
    );
  }
}
