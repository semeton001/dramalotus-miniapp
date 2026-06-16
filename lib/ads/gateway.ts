import { showAdsgramAd } from "@/lib/adsgram/service";

export async function showInterstitialAd(): Promise<boolean> {
  return showAdsgramAd("interstitial");
}

export async function showRewardedAd(): Promise<boolean> {
  return showAdsgramAd("rewarded");
}

export function shouldShowEpisodeAd(
  episodeNumber: number,
  isVip: boolean
): boolean {
  if (isVip) {
    return false;
  }

  return episodeNumber > 1 && episodeNumber % 2 === 0;
}
