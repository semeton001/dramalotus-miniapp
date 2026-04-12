export type AdMediaType = "video" | "image";

export type AdCampaign = {
  id: string;
  name: string;
  active: boolean;

  mediaType: AdMediaType;
  mediaUrl: string;
  posterUrl?: string;

  headline?: string;
  body?: string;

  skipAfterSeconds: number;
  totalDurationSeconds: number;
};

export const MOCK_AD_CAMPAIGN: AdCampaign = {
  id: "ad-001",
  name: "Mock Portrait Ad",
  active: true,

  mediaType: "video",
  mediaUrl: "/mock-ads/ad-video.mp4",
  posterUrl: "/mock-ads/ad-poster.jpg",

  headline: "Promo Spesial",
  body: "Ini contoh iklan portrait untuk user free sebelum episode diputar.",

  skipAfterSeconds: 5,
  totalDurationSeconds: 10,
};

export type ResolveAdCampaignReason =
  | "eligible"
  | "vip"
  | "no_active_campaign"
  | "episode_not_targeted"
  | "placement_not_supported";

export type ResolvedAdCampaign = AdCampaign & {
  source: "manual" | "gam";
  placement: "player_gate_portrait";

  ctaLabel?: string;
  ctaUrl?: string;

  tracking?: {
    impressionUrl?: string;
    clickUrl?: string;
    completeUrl?: string;
    skipUrl?: string;
  };

  meta?: {
    advertiserName?: string;
    campaignKey?: string;
    lineItemId?: string;
    creativeId?: string;
  };
};

export type ResolveAdCampaignResponse = {
  ok: boolean;
  requestId: string;
  placement: "player_gate_portrait";
  decision: {
    shouldShowAd: boolean;
    reason: ResolveAdCampaignReason;
  };
  campaign: ResolvedAdCampaign | null;
};

export const MOCK_RESOLVE_AD_CAMPAIGN_RESPONSE: ResolveAdCampaignResponse = {
  ok: true,
  requestId: "req_mock_001",
  placement: "player_gate_portrait",
  decision: {
    shouldShowAd: true,
    reason: "eligible",
  },
  campaign: {
    ...MOCK_AD_CAMPAIGN,
    source: "manual",
    placement: "player_gate_portrait",
    ctaLabel: "Lihat Promo",
    ctaUrl: "https://example.com/promo",
    tracking: {
      impressionUrl: "/api/ad-events/impression",
      clickUrl: "/api/ad-events/click",
      completeUrl: "/api/ad-events/complete",
      skipUrl: "/api/ad-events/skip",
    },
    meta: {
      advertiserName: "Brand A",
      campaignKey: "brand-a-q2",
    },
  },
};

export type ManualAdCampaign = ResolvedAdCampaign & {
  targeting?: {
    placements?: Array<"player_gate_portrait">;
    memberships?: Array<"free" | "vip">;
    episodeNumbers?: number[];
    sourceNames?: string[];
    mediaTypes?: Array<"video" | "image">;
  };
};

export const MANUAL_AD_CAMPAIGNS: ManualAdCampaign[] = [
  {
    id: "manual-video-001",
    name: "Manual Video Portrait",
    active: true,
    source: "manual",
    placement: "player_gate_portrait",
    mediaType: "video",
    mediaUrl: "/mock-ads/ad-video.mp4",
    posterUrl: "/mock-ads/ad-poster.jpg",
    headline: "Promo Video",
    body: "Campaign video manual untuk player gate portrait.",
    ctaLabel: "Lihat Promo",
    ctaUrl: "https://example.com/promo-video",
    skipAfterSeconds: 5,
    totalDurationSeconds: 10,
    tracking: {
      impressionUrl: "/api/ad-events",
      clickUrl: "/api/ad-events",
      completeUrl: "/api/ad-events",
      skipUrl: "/api/ad-events",
    },
    meta: {
      advertiserName: "Brand A",
      campaignKey: "brand-a-video",
    },
    targeting: {
      placements: ["player_gate_portrait"],
      memberships: ["free"],
      mediaTypes: ["video"],
    },
  },
  {
    id: "manual-image-001",
    name: "Manual Image Portrait",
    active: true,
    source: "manual",
    placement: "player_gate_portrait",
    mediaType: "image",
    mediaUrl: "/mock-ads/ad-poster.jpg",
    posterUrl: "/mock-ads/ad-poster.jpg",
    headline: "Promo Image",
    body: "Campaign image manual untuk player gate portrait.",
    ctaLabel: "Buka Promo",
    ctaUrl: "https://example.com/promo-image",
    skipAfterSeconds: 5,
    totalDurationSeconds: 10,
    tracking: {
      impressionUrl: "/api/ad-events",
      clickUrl: "/api/ad-events",
      completeUrl: "/api/ad-events",
      skipUrl: "/api/ad-events",
    },
    meta: {
      advertiserName: "Brand B",
      campaignKey: "brand-b-image",
    },
    targeting: {
      placements: ["player_gate_portrait"],
      memberships: ["free"],
      mediaTypes: ["image"],
    },
  },
];

export function resolveManualAdCampaign(input: {
  placement: "player_gate_portrait";
  membership: "free" | "vip";
  episodeNumber: number;
  sourceName?: string;
  mediaType?: "video" | "image";
}) {
  return (
    MANUAL_AD_CAMPAIGNS.find((campaign) => {
      if (!campaign.active) return false;

      const t = campaign.targeting;
      if (t?.placements?.length && !t.placements.includes(input.placement))
        return false;
      if (t?.memberships?.length && !t.memberships.includes(input.membership))
        return false;
      if (
        t?.episodeNumbers?.length &&
        !t.episodeNumbers.includes(input.episodeNumber)
      )
        return false;
      if (
        t?.sourceNames?.length &&
        !t.sourceNames
          .map((v) => v.toLowerCase())
          .includes((input.sourceName || "").toLowerCase())
      )
        return false;
      if (
        t?.mediaTypes?.length &&
        input.mediaType &&
        !t.mediaTypes.includes(input.mediaType)
      )
        return false;

      return true;
    }) ?? null
  );
}
