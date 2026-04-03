import { NextResponse } from "next/server";
import { adaptDramaBoxDramaList } from "@/lib/adapters/drama";
import type { DramaBoxDramaResponse } from "@/lib/adapters/drama/dramabox";

const DRAMABOX_BASE_URL = "https://dramabox.dramabos.my.id/api/v1";
const DRAMABOX_LANG = "in";

async function fetchDramaBoxPopular() {
  const response = await fetch(
    `${DRAMABOX_BASE_URL}/populersearch?lang=${DRAMABOX_LANG}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `DramaBox populersearch request failed with status ${response.status}`,
    );
  }

  return response.json();
}

function isDramaBoxDramaLike(value: unknown): value is DramaBoxDramaResponse {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.bookId === "string" &&
    item.bookId.trim().length > 0 &&
    typeof item.bookName === "string" &&
    item.bookName.trim().length > 0
  );
}

function extractDramaBoxItemsDeep(raw: unknown): DramaBoxDramaResponse[] {
  const results: DramaBoxDramaResponse[] = [];

  const visit = (node: unknown) => {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    if (isDramaBoxDramaLike(node)) {
      results.push(node);
      return;
    }

    if (typeof node === "object") {
      Object.values(node as Record<string, unknown>).forEach(visit);
    }
  };

  visit(raw);
  return results;
}

function dedupeDramaBoxItems(
  items: DramaBoxDramaResponse[],
): DramaBoxDramaResponse[] {
  const deduped = new Map<string, DramaBoxDramaResponse>();

  for (const item of items) {
    if (!deduped.has(item.bookId)) {
      deduped.set(item.bookId, item);
    }
  }

  return Array.from(deduped.values());
}

export async function GET() {
  try {
    const raw = await fetchDramaBoxPopular();
    const extractedItems = extractDramaBoxItemsDeep(raw);
    const dedupedItems = dedupeDramaBoxItems(extractedItems);

    console.log("DramaBox popular extracted count:", extractedItems.length);
    console.log("DramaBox popular deduped count:", dedupedItems.length);

    const dramas = adaptDramaBoxDramaList(dedupedItems).filter(
      (item) => item.id > 0 && item.title.trim().length > 0,
    );

    return NextResponse.json(dramas);
  } catch (error) {
    console.error("Failed to fetch DramaBox popular:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch DramaBox popular",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
