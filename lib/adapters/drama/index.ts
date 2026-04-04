import type { Drama } from "@/types/drama";
import {
  adaptDramaBoxDetail,
  adaptDramaBoxDrama,
  adaptDramaBoxDramaList,
  adaptDramaBoxSearchList,
  mergeDramaBoxDramaMetadata,
  type DramaBoxDetailResponse,
  type DramaBoxDramaResponse,
  type DramaBoxSearchItemResponse,
} from "./dramabox";
import { adaptReelShortDramas } from "./reelshort";
import {
  adaptMeloloDrama,
  adaptMeloloDramaDetail,
  adaptMeloloDramaList,
  adaptMeloloSearchList,
} from "./melolo";
import {
  buildDramawaveDrama,
  normalizeDramawaveFeed,
} from "./dramawave";
import {
  buildNetshortDrama,
  normalizeNetshortFeed,
} from "./netshort";

export * from "./dramabox";
export * from "./reelshort";
export * from "./melolo";
export * from "./dramawave";
export * from "./netshort";

export {
  adaptDramaBoxDetail,
  adaptDramaBoxDrama,
  adaptDramaBoxDramaList,
  adaptDramaBoxSearchList,
  mergeDramaBoxDramaMetadata,
  adaptReelShortDramas,
  adaptMeloloDrama,
  adaptMeloloDramaList,
  adaptMeloloSearchList,
  adaptMeloloDramaDetail,
  buildDramawaveDrama,
  normalizeDramawaveFeed,
  buildNetshortDrama,
  normalizeNetshortFeed,
};

function adaptDramawaveDramaList(rawItems: unknown[]): Drama[] {
  return normalizeDramawaveFeed({ items: rawItems }, "home", "4");
}

function adaptDramawaveSearchList(rawItems: unknown[]): Drama[] {
  return normalizeDramawaveFeed({ items: rawItems }, "search", "4");
}

function adaptDramawaveDramaDetail(
  rawItem: unknown,
): Partial<Drama> & { id: number } {
  const adapted = buildDramawaveDrama(rawItem, 0, "home", "4");

  if (!adapted) {
    throw new Error("Invalid Dramawave detail payload.");
  }

  return adapted as Partial<Drama> & { id: number };
}

function adaptNetshortDramaList(rawItems: unknown[]): Drama[] {
  return normalizeNetshortFeed({ items: rawItems }, "home", "5");
}

function adaptNetshortSearchList(rawItems: unknown[]): Drama[] {
  return normalizeNetshortFeed({ items: rawItems }, "search", "5");
}

function adaptNetshortDramaDetail(
  rawItem: unknown,
): Partial<Drama> & { id: number } {
  const adapted = buildNetshortDrama(rawItem, 0, "detail", "5");

  if (!adapted) {
    throw new Error("Invalid Netshort detail payload.");
  }

  return adapted as Partial<Drama> & { id: number };
}

export function adaptDramaListBySource(
  sourceSlug: string,
  rawItems: unknown[],
): Drama[] {
  switch (sourceSlug) {
    case "dramabox":
      return adaptDramaBoxDramaList(rawItems as DramaBoxDramaResponse[]);
    case "reelshort":
      return adaptReelShortDramas(rawItems);
    case "melolo":
      return adaptMeloloDramaList(rawItems);
    case "dramawave":
      return adaptDramawaveDramaList(rawItems);
    case "netshort":
      return adaptNetshortDramaList(rawItems);
    default:
      throw new Error(`No drama adapter registered for source: ${sourceSlug}`);
  }
}

export function adaptDramaSearchListBySource(
  sourceSlug: string,
  rawItems: unknown[],
): Drama[] {
  switch (sourceSlug) {
    case "dramabox":
      return adaptDramaBoxSearchList(rawItems as DramaBoxSearchItemResponse[]);
    case "reelshort":
      return adaptReelShortDramas(rawItems);
    case "melolo":
      return adaptMeloloSearchList(rawItems);
    case "dramawave":
      return adaptDramawaveSearchList(rawItems);
    case "netshort":
      return adaptNetshortSearchList(rawItems);
    default:
      throw new Error(
        `No drama search adapter registered for source: ${sourceSlug}`,
      );
  }
}

export function adaptDramaDetailBySource(
  sourceSlug: string,
  rawItem: unknown,
): Partial<Drama> & { id: number } {
  switch (sourceSlug) {
    case "dramabox":
      return adaptDramaBoxDetail(rawItem as DramaBoxDetailResponse);
    case "reelshort": {
      const adapted = adaptReelShortDramas([rawItem])[0];

      if (!adapted) {
        throw new Error("Invalid ReelShort detail payload.");
      }

      return adapted;
    }
    case "melolo": {
      const adapted = adaptMeloloDramaDetail(rawItem);

      if (!adapted) {
        throw new Error("Invalid Melolo detail payload.");
      }

      return adapted as Partial<Drama> & { id: number };
    }
    case "dramawave":
      return adaptDramawaveDramaDetail(rawItem);
    case "netshort":
      return adaptNetshortDramaDetail(rawItem);
    default:
      throw new Error(
        `No drama detail adapter registered for source: ${sourceSlug}`,
      );
  }
}
