import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";
import { respondStream } from "../_shared";
import { checkStreamRateLimit } from "@/lib/rate-limit/stream";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const rateLimitError = checkStreamRateLimit({
    request,
    provider: "reelshort",
    userId: user.id,
  });
  if (rateLimitError) return rateLimitError;

  const directUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";
  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";

  if (!directUrl && !token) {
    const episodeId =
      request.nextUrl.searchParams.get("episodeId")?.trim() ?? "";

    const episodeNumberParam =
      request.nextUrl.searchParams.get("episodeNumber")?.trim() ||
      request.nextUrl.searchParams.get("ep")?.trim() ||
      "";

    const episodeNumber = Number(episodeNumberParam || episodeId);

    if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
      return NextResponse.json(
        { ok: false, error: "episodeNumber tidak valid." },
        { status: 400 },
      );
    }

    const isFreeEpisode = episodeNumber <= FREE_EPISODE_LIMIT;

    if (!isFreeEpisode && user.membership_status !== "vip") {
      return NextResponse.json(
        {
          ok: false,
          error: "VIP_REQUIRED",
          message: "Episode ini hanya untuk VIP.",
        },
        { status: 403 },
      );
    }

    if (user.membership_status === "vip" && user.vip_until) {
      const expiresAt = new Date(user.vip_until).getTime();

      if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
        return NextResponse.json(
          { ok: false, error: "VIP_EXPIRED" },
          { status: 403 },
        );
      }
    }
  }

  return respondStream(request, user.id);
}
