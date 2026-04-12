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
import {
  buildFlickreelsDrama,
  normalizeFlickreelsFeed,
} from "./flickreels";
import {
  buildShortmaxDrama,
  normalizeShortmaxFeed,
} from "./shortmax";

export * from "./dramabox";
export * from "./reelshort";
export * from "./melolo";
export * from "./dramawave";
export * from "./netshort";
export * from "./flickreels";
export * from "./shortmax";

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
  buildFlickreelsDrama,
  normalizeFlickreelsFeed,
  buildShortmaxDrama,
  normalizeShortmaxFeed,
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

function adaptFlickreelsDramaList(rawItems: unknown[]): Drama[] {
  return normalizeFlickreelsFeed({ data: { data: rawItems } }, "home", "6");
}

function adaptFlickreelsSearchList(rawItems: unknown[]): Drama[] {
  return normalizeFlickreelsFeed({ data: { data: rawItems } }, "search", "6");
}

function adaptFlickreelsDramaDetail(
  rawItem: unknown,
): Partial<Drama> & { id: number } {
  const adapted = buildFlickreelsDrama(rawItem, 0, "detail", "6");

  if (!adapted) {
    throw new Error("Invalid Flickreels detail payload.");
  }

  return adapted as Partial<Drama> & { id: number };
}

function adaptShortmaxDramaList(rawItems: unknown[]): Drama[] {
  return normalizeShortmaxFeed({ data: { list: rawItems } }, "home", "7");
}

function adaptShortmaxSearchList(rawItems: unknown[]): Drama[] {
  return normalizeShortmaxFeed({ data: { list: rawItems } }, "search", "7");
}

function adaptShortmaxDramaDetail(
  rawItem: unknown,
): Partial<Drama> & { id: number } {
  const adapted = buildShortmaxDrama(rawItem, 0, "detail", "7");

  if (!adapted) {
    throw new Error("Invalid Shortmax detail payload.");
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
    case "flickreels":
      return adaptFlickreelsDramaList(rawItems);
    case "shortmax":
      return adaptShortmaxDramaList(rawItems);
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
    case "flickreels":
      return adaptFlickreelsSearchList(rawItems);
    case "shortmax":
      return adaptShortmaxSearchList(rawItems);
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
    case "flickreels":
      return adaptFlickreelsDramaDetail(rawItem);
    case "shortmax":
      return adaptShortmaxDramaDetail(rawItem);
    default:
      throw new Error(
        `No drama detail adapter registered for source: ${sourceSlug}`,
      );
  }
}
