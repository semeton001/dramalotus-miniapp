import type { Drama } from "@/types/drama";
import {
  adaptDramaBoxDrama,
  adaptDramaBoxDramaList,
  adaptDramaBoxSearchList,
  type DramaBoxDramaResponse,
  type DramaBoxSearchItemResponse,
} from "./dramabox";

export { adaptDramaBoxDrama, adaptDramaBoxDramaList, adaptDramaBoxSearchList };

export function adaptDramaListBySource(
  sourceSlug: string,
  rawItems: unknown[],
): Drama[] {
  switch (sourceSlug) {
    case "dramabox":
      return adaptDramaBoxDramaList(rawItems as DramaBoxDramaResponse[]);
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
    default:
      throw new Error(
        `No drama search adapter registered for source: ${sourceSlug}`,
      );
  }
}
