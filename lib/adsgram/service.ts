import { AdsgramAdType } from "./types";

export async function showAdsgramAd(
  type: AdsgramAdType
): Promise<boolean> {
  switch (type) {
    case "interstitial":
      console.log("[AdsGram] interstitial");
      return false;

    case "rewarded":
      console.log("[AdsGram] rewarded");
      return false;

    default:
      return false;
  }
}
