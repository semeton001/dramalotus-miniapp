import { NextRequest, NextResponse } from "next/server";
import {
  REELIFE_DEFAULT_PLAY_CODE,
  ReelifeBookDetailResponse,
  ReelifeChapterItem,
  collectReelifeCode,
  getLang,
  getString,
  reelifeFetch,
  toArray,
} from "../_shared";

function buildStableMediaUrl(
  req: NextRequest,
  url: string,
  dramaId: string,
  episodeId: string,
  code = "",
) {
  const nextUrl = new URL(req.nextUrl.pathname, req.url);
  nextUrl.searchParams.set("url", url);
  nextUrl.searchParams.set("dramaId", dramaId);
  nextUrl.searchParams.set("episodeId", episodeId);
  if (code) nextUrl.searchParams.set("code", code);
  return nextUrl.toString();
}

async function proxyRemoteMedia(req: NextRequest, url: string) {
  const range = req.headers.get("range");

  const upstream = await fetch(url, {
    headers: {
      ...(range ? { Range: range } : {}),
      Referer: "https://reelife.dramabos.my.id/",
      Origin: "https://reelife.dramabos.my.id",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
    cache: "no-store",
  });

  if (!upstream.ok && upstream.status !== 206) {
    const body = await upstream.text().catch(() => "");
    return NextResponse.json(
      {
        ok: false,
        source: "reelife",
        step: "proxyRemoteMedia",
        error: `Upstream media error ${upstream.status}: ${body.slice(0, 300)}`,
      },
      { status: 502 },
    );
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type") || "video/mp4";
  const contentLength = upstream.headers.get("content-length");
  const contentRange = upstream.headers.get("content-range");
  const acceptRanges = upstream.headers.get("accept-ranges");

  headers.set("content-type", contentType);
  if (contentLength) headers.set("content-length", contentLength);
  if (contentRange) headers.set("content-range", contentRange);
  if (acceptRanges) headers.set("accept-ranges", acceptRanges);
  headers.set("cache-control", "no-store");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}

async function resolveFromPlay(
  dramaId: string,
  episodeId: string,
  code: string,
  lang: string,
) {
  try {
    const query = new URLSearchParams({ code, lang });
    const payload = await reelifeFetch<{
      videoUrl?: string;
      standbyUrls?: string[];
    }>(`/api/v1/play/${dramaId}/${episodeId}?${query.toString()}`);

    return getString(payload?.videoUrl);
  } catch {
    return "";
  }
}

async function resolveFromBookPreview(
  dramaId: string,
  episodeId: string,
  lang: string,
) {
  try {
    const payload = await reelifeFetch<ReelifeBookDetailResponse>(
      `/api/v1/book/${dramaId}?lang=${lang}`,
    );

    const items = toArray<ReelifeChapterItem>(payload?.data?.chapterContentList);
    const target = items.find((item) => getString(item.chapterId) === episodeId);

    return {
      url: getString(target?.mp4720p),
      code:
        collectReelifeCode(payload, payload?.data?.bookVo, ...items) ||
        REELIFE_DEFAULT_PLAY_CODE,
    };
  } catch {
    return {
      url: "",
      code: REELIFE_DEFAULT_PLAY_CODE,
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const passthroughUrl = getString(req.nextUrl.searchParams.get("url"));
    if (passthroughUrl) {
      return proxyRemoteMedia(req, passthroughUrl);
    }

    const dramaId = getString(req.nextUrl.searchParams.get("dramaId"));
    const episodeId = getString(req.nextUrl.searchParams.get("episodeId"));
    const lang = getLang(req);

    let code =
      collectReelifeCode(req.nextUrl.searchParams.get("code")) ||
      REELIFE_DEFAULT_PLAY_CODE;

    if (!dramaId || !episodeId) {
      return NextResponse.json(
        {
          ok: false,
          source: "reelife",
          error: "Missing dramaId or episodeId",
        },
        { status: 400 },
      );
    }

    let resolvedUrl = await resolveFromPlay(dramaId, episodeId, code, lang);

    if (!resolvedUrl) {
      const preview = await resolveFromBookPreview(dramaId, episodeId, lang);

      if (!code && preview.code) {
        code = preview.code;
      }

      if (preview.url) {
        resolvedUrl = preview.url;
      }
    }

    if (!resolvedUrl && code) {
      resolvedUrl = await resolveFromPlay(dramaId, episodeId, code, lang);
    }

    if (!resolvedUrl) {
      return NextResponse.json(
        {
          ok: false,
          source: "reelife",
          dramaId,
          episodeId,
          code,
          error: "No playable Reelife stream resolved",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      source: "reelife",
      dramaId,
      episodeId,
      code,
      url: buildStableMediaUrl(req, resolvedUrl, dramaId, episodeId, code),
      directUrl: resolvedUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: "reelife",
        error:
          error instanceof Error
            ? error.message
            : "Unknown Reelife stream error",
      },
      { status: 500 },
    );
  }
}