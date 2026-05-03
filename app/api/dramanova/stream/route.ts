import { NextRequest, NextResponse } from "next/server";
import { requireApiVip } from "@/lib/auth/requireApiVip";
import {
  proxyRemoteMedia,
  resolveDramaNovaVideoUrl,
} from "../_shared";

export async function GET(request: NextRequest) {
  const vipError = await requireApiVip();
  if (vipError) return vipError;

  try {
    let rawUrl =
      request.nextUrl.searchParams.get("url")?.trim() ||
      request.nextUrl.searchParams.get("u")?.trim() ||
      "";
    const fileId =
      request.nextUrl.searchParams.get("fileId")?.trim() ||
      request.nextUrl.searchParams.get("id")?.trim() ||
      "";

    if (!rawUrl && fileId) {
      rawUrl = await resolveDramaNovaVideoUrl(fileId);
    }

    if (!rawUrl) {
      return NextResponse.json(
        { error: "Missing DramaNova stream url or fileId." },
        { status: 400 },
      );
    }

    return proxyRemoteMedia(request, rawUrl);
  } catch (error) {
    console.error("DramaNova stream route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load DramaNova stream.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
