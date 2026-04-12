import { NextRequest, NextResponse } from "next/server";
import {
  REELIFE_DEFAULT_PLAY_CODE,
  adaptReelifeEpisode,
  collectReelifeCode,
  findPreviewEpisode,
  getLang,
  getNumber,
  getString,
  reelifeFetch,
  toArray,
} from "../_shared";
import type {
  ReelifeBookDetailResponse,
  ReelifeChaptersResponse,
  ReelifeChapterItem,
} from "../_shared";

export async function GET(req: NextRequest) {
  try {
    const dramaId = getString(req.nextUrl.searchParams.get("dramaId"));
    const numericDramaId = getNumber(
      req.nextUrl.searchParams.get("numericDramaId"),
      0,
    );
    const lang = getLang(req);

    if (!dramaId) {
      return NextResponse.json({ error: "Missing dramaId" }, { status: 400 });
    }

    const [chaptersPayload, detailPayload] = await Promise.all([
      reelifeFetch<ReelifeChaptersResponse>(
        `/api/v1/book/${dramaId}/chapters?lang=${lang}`,
      ),
      reelifeFetch<ReelifeBookDetailResponse>(
        `/api/v1/book/${dramaId}?lang=${lang}`,
      ),
    ]);

    const detailEpisodes = toArray<ReelifeChapterItem>(
      detailPayload?.data?.chapterContentList,
    );
    const chapterList = toArray<ReelifeChapterItem>(
      chaptersPayload?.data?.chapterList,
    );

    const sharedCode =
      collectReelifeCode(
        req.nextUrl.searchParams.get("code"),
        chaptersPayload,
        detailPayload,
        detailPayload?.data?.bookVo,
        ...detailEpisodes,
      ) || REELIFE_DEFAULT_PLAY_CODE;

    const episodes = chapterList.map((chapter, index) => {
      const chapterId = getString(chapter.chapterId);
      const preview = findPreviewEpisode(detailEpisodes, chapterId);

      const episodeCode =
        collectReelifeCode(chapter, preview, sharedCode) || sharedCode;

      return adaptReelifeEpisode(
        {
          ...chapter,
          ...(preview || {}),
          code: episodeCode,
        },
        {
          numericDramaId,
          dramaId,
          code: episodeCode,
          fallbackVideoUrl: getString(preview?.mp4720p),
          index,
        },
      );
    });

    return NextResponse.json(episodes);
  } catch (error) {
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
