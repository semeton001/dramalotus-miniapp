import { NextRequest, NextResponse } from "next/server";
import {
  IDRAMA_DEFAULT_CODE,
  buildProxyBaseUrl,
  fetchIdramaJson,
  getSearchParam,
  rewriteM3u8Playlist,
} from "../_shared";

type JsonRecord = Record<string, unknown>;

function forwardHeaders(contentType?: string | null) {
  const headers = new Headers();
  if (contentType) headers.set("content-type", contentType);
  headers.set("access-control-allow-origin", "*");
  headers.set("cache-control", "no-store");
  return headers;
}

function getNestedPlayInfoList(payload: unknown): unknown[] {
  if (!payload || typeof payload !== "object") return [];

  const raw = payload as JsonRecord;
  const targetEpInfo =
    raw["target_ep_info"] && typeof raw["target_ep_info"] === "object"
      ? (raw["target_ep_info"] as JsonRecord)
      : null;

  if (targetEpInfo) {
    const targetList = targetEpInfo["play_info_list"];
    if (Array.isArray(targetList)) {
      return targetList;
    }
  }

  const candidates: unknown[] = [
    raw["play_info_list"],
    raw["data"],
    raw["result"],
    raw["item"],
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (candidate && typeof candidate === "object") {
      const nested = candidate as JsonRecord;
      const nestedList = nested["play_info_list"];
      if (Array.isArray(nestedList)) {
        return nestedList;
      }

      const nestedData = nested["data"];
      if (nestedData && typeof nestedData === "object") {
        const nestedDataRecord = nestedData as JsonRecord;
        const nestedDataList = nestedDataRecord["play_info_list"];
        if (Array.isArray(nestedDataList)) {
          return nestedDataList;
        }
      }
    }
  }

  return [];
}

function extractPlayableUrl(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const raw = payload as JsonRecord;
  const targetEpInfo =
    raw["target_ep_info"] && typeof raw["target_ep_info"] === "object"
      ? (raw["target_ep_info"] as JsonRecord)
      : null;

  if (targetEpInfo) {
    const targetPlayInfoList = Array.isArray(targetEpInfo["play_info_list"])
      ? (targetEpInfo["play_info_list"] as unknown[])
      : [];

    const firstPlayableFromTarget = targetPlayInfoList.find((item) => {
      if (!item || typeof item !== "object") return false;
      const playUrl = (item as JsonRecord)["play_url"];
      return typeof playUrl === "string" && playUrl.trim().length > 0;
    });

    if (firstPlayableFromTarget && typeof firstPlayableFromTarget === "object") {
      const playUrl = String(
        (firstPlayableFromTarget as JsonRecord)["play_url"] || "",
      ).trim();

      if (playUrl) return playUrl;
    }

    const fallbackTargetPlayUrl = targetEpInfo["play_url"];
    if (
      typeof fallbackTargetPlayUrl === "string" &&
      fallbackTargetPlayUrl.trim().length > 0
    ) {
      return fallbackTargetPlayUrl.trim();
    }
  }

  const playInfoList = getNestedPlayInfoList(payload);

  const firstPlayable = playInfoList.find((item) => {
    if (!item || typeof item !== "object") return false;
    const rawItem = item as JsonRecord;
    return typeof rawItem["play_url"] === "string" && rawItem["play_url"].trim().length > 0;
  });

  if (!firstPlayable || typeof firstPlayable !== "object") return "";

  return String((firstPlayable as JsonRecord)["play_url"] || "").trim();
}

function unwrapIdramaProxyUrl(value: string): string {
  try {
    const url = new URL(value);
    const wrapped = url.searchParams.get("url");
    if (wrapped && wrapped.trim()) {
      return decodeURIComponent(wrapped.trim());
    }
    return value;
  } catch {
    return value;
  }
}

async function fetchMediaResponse(targetUrl: string) {
  return fetch(targetUrl, {
    headers: {
      Accept: "*/*",
      Referer: "https://idrama.dramabos.my.id/",
      Origin: "https://idrama.dramabos.my.id",
    },
    cache: "no-store",
  });
}

async function proxyMedia(request: NextRequest, targetUrl: string) {
  const response = await fetchMediaResponse(targetUrl);

  if (!response.ok) {
    return NextResponse.json(
      { error: `Failed to proxy media: ${response.status}`, targetUrl },
      { status: response.status },
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const headers = forwardHeaders(contentType);
  const activeTargetUrl = response.url || targetUrl;

  if (
    activeTargetUrl.includes(".m3u8") ||
    contentType.includes("application/vnd.apple.mpegurl") ||
    contentType.includes("application/x-mpegURL")
  ) {
    const text = await response.text();
    const rewritten = rewriteM3u8Playlist(
      text,
      buildProxyBaseUrl(request),
      activeTargetUrl,
    );
    headers.delete("content-length");
    return new NextResponse(rewritten, { status: 200, headers });
  }

  const body = await response.arrayBuffer();
  return new NextResponse(body, { status: 200, headers });
}

export async function GET(request: NextRequest) {
  try {
    const directUrl = getSearchParam(request, "url");

    if (directUrl) {
      return proxyMedia(request, directUrl);
    }

    const dramaId = getSearchParam(request, "dramaId");
    const ep = getSearchParam(request, "ep");
    const code = getSearchParam(request, "code", IDRAMA_DEFAULT_CODE);

    if (!dramaId || !ep) {
      return NextResponse.json(
        { error: "Missing dramaId or ep." },
        { status: 400 },
      );
    }

    const payload = await fetchIdramaJson(`/unlock/${dramaId}/${ep}`, { code });
    const rawPlayUrl = extractPlayableUrl(payload);

    if (!rawPlayUrl) {
      return NextResponse.json(
        {
          error: "No playable stream found.",
          payloadShape: Object.keys((payload as JsonRecord) || {}),
        },
        { status: 404 },
      );
    }

    const unwrappedUrl = unwrapIdramaProxyUrl(rawPlayUrl);

    let response = await fetchMediaResponse(unwrappedUrl);

    if (!response.ok && unwrappedUrl !== rawPlayUrl) {
      response = await fetchMediaResponse(rawPlayUrl);
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to load HLS stream: ${response.status}`,
          rawPlayUrl,
          unwrappedUrl,
        },
        { status: response.status },
      );
    }

    const contentType = response.headers.get("content-type") || "";
    const headers = forwardHeaders(contentType);
    const activeTargetUrl = response.url || unwrappedUrl || rawPlayUrl;

    if (
      activeTargetUrl.includes(".m3u8") ||
      contentType.includes("application/vnd.apple.mpegurl") ||
      contentType.includes("application/x-mpegURL")
    ) {
      const text = await response.text();
      const rewritten = rewriteM3u8Playlist(
        text,
        buildProxyBaseUrl(request),
        activeTargetUrl,
      );
      headers.delete("content-length");
      return new NextResponse(rewritten, { status: 200, headers });
    }

    const body = await response.arrayBuffer();
    return new NextResponse(body, { status: 200, headers });
  } catch (error) {
    console.error("iDrama stream route error:", error);
    return NextResponse.json(
      { error: "Failed to load iDrama stream." },
      { status: 500 },
    );
  }
}
