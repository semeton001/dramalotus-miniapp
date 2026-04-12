import { NextRequest, NextResponse } from "next/server";
import {
  type ResolveAdCampaignResponse,
  resolveManualAdCampaign,
} from "@/types/ad";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const dramaId = searchParams.get("dramaId") || "";
  const episodeNumber = Number(searchParams.get("episodeNumber") || "0");
  const placement = searchParams.get("placement") || "player_gate_portrait";
  const membership = searchParams.get("membership") || "free";
  const sourceName = searchParams.get("sourceName") || "";
  const mediaType = (searchParams.get("mediaType") || "video") as
    | "video"
    | "image";

  const isSupportedPlacement = placement === "player_gate_portrait";
  const isVip = membership === "vip";
  const isEligibleEpisode = Number.isFinite(episodeNumber) && episodeNumber > 0;

  if (!isSupportedPlacement) {
    return NextResponse.json({
      ok: true,
      requestId: `req_${Date.now()}`,
      placement: "player_gate_portrait",
      decision: { shouldShowAd: false, reason: "placement_not_supported" },
      campaign: null,
    } satisfies ResolveAdCampaignResponse);
  }

  if (isVip) {
    return NextResponse.json({
      ok: true,
      requestId: `req_${Date.now()}`,
      placement: "player_gate_portrait",
      decision: { shouldShowAd: false, reason: "vip" },
      campaign: null,
    } satisfies ResolveAdCampaignResponse);
  }

  if (!isEligibleEpisode) {
    return NextResponse.json({
      ok: true,
      requestId: `req_${Date.now()}`,
      placement: "player_gate_portrait",
      decision: { shouldShowAd: false, reason: "episode_not_targeted" },
      campaign: null,
    } satisfies ResolveAdCampaignResponse);
  }

  const campaign = resolveManualAdCampaign({
    placement: "player_gate_portrait",
    membership: "free",
    episodeNumber,
    sourceName,
    mediaType,
  });

  return NextResponse.json({
    ok: true,
    requestId: `req_${Date.now()}`,
    placement: "player_gate_portrait",
    decision: {
      shouldShowAd: !!campaign,
      reason: campaign ? "eligible" : "no_active_campaign",
    },
    campaign,
  } satisfies ResolveAdCampaignResponse);
}
