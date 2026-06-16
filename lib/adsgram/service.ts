import { ADSGRAM_CONFIG } from "./config";
import { AdsgramAdType } from "./types";

declare global {
  interface Window {
    Adsgram?: {
      init: (params: { blockId: string }) => {
        show: () => Promise<unknown>;
        destroy?: () => void;
      };
    };
  }
}

let sdkPromise: Promise<void> | null = null;

async function loadAdsgramSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  if (window.Adsgram) {
    return;
  }

  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");

    script.src = "https://sad.adsgram.ai/js/sad.min.js";
    script.async = true;

    script.onload = () => resolve();

    script.onerror = () =>
      reject(new Error("Failed to load AdsGram SDK"));

    document.head.appendChild(script);
  });

  return sdkPromise;
}

async function showBlock(blockId: string): Promise<boolean> {
  try {
    await loadAdsgramSdk();

    if (!window.Adsgram) {
      return false;
    }

    const controller = window.Adsgram.init({
      blockId,
    });

    await controller.show();

    controller.destroy?.();

    return true;
  } catch (error) {
    console.error("[AdsGram]", error);

    return false;
  }
}

export async function showAdsgramAd(
  type: AdsgramAdType
): Promise<boolean> {
  switch (type) {
    case "interstitial": {
      const videoResult = await showBlock(
        ADSGRAM_CONFIG.interstitialVideoBlockId
      );

      if (videoResult) {
        return true;
      }

      return showBlock(
        ADSGRAM_CONFIG.interstitialImageBlockId
      );
    }

    case "rewarded":
      return false;

    default:
      return false;
  }
}
