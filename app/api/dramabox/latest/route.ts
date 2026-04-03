import { NextResponse } from "next/server";
import { adaptDramaBoxDramaList } from "@/lib/adapters/drama";
import type { DramaBoxDramaResponse } from "@/lib/adapters/drama/dramabox";

const DRAMABOX_BASE_URL = "https://dramabox.dramabos.my.id/api/v1";
const DRAMABOX_LANG = "in";
const HOMEPAGE_PAGES = [1, 2, 3, 4];

async function fetchJson(url: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`DramaBox request failed: ${response.status} for ${url}`);
  }

  return response.json();
}

async function fetchDramaBoxLatest() {
  return fetchJson(`${DRAMABOX_BASE_URL}/latest?lang=${DRAMABOX_LANG}`);
}

async function fetchDramaBoxHomePage(page: number) {
  return fetchJson(
    `${DRAMABOX_BASE_URL}/homepage?page=${page}&lang=${DRAMABOX_LANG}`,
  );
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

function mergeUniqueDramaBoxItems(
  groups: DramaBoxDramaResponse[][],
): DramaBoxDramaResponse[] {
  const deduped = new Map<string, DramaBoxDramaResponse>();

  for (const group of groups) {
    for (const item of group) {
      if (!deduped.has(item.bookId)) {
        deduped.set(item.bookId, item);
      }
    }
  }

  return Array.from(deduped.values());
}

export async function GET() {
  try {
    const [latestPayload, ...homepagePayloads] = await Promise.all([
      fetchDramaBoxLatest(),
      ...HOMEPAGE_PAGES.map((page) => fetchDramaBoxHomePage(page)),
    ]);

    const latestItems = extractDramaBoxItemsDeep(latestPayload);
    const homepageItems = homepagePayloads.flatMap((raw) =>
      extractDramaBoxItemsDeep(raw),
    );

    const mergedItems = mergeUniqueDramaBoxItems([latestItems, homepageItems]);

    console.log("DramaBox latest primary count:", latestItems.length);
    console.log(
      "DramaBox latest homepage supplement count:",
      homepageItems.length,
    );
    console.log("DramaBox latest deduped total:", mergedItems.length);

    const dramas = adaptDramaBoxDramaList(mergedItems).filter(
      (item) => item.id > 0 && item.title.trim().length > 0,
    );

    return NextResponse.json(dramas);
  } catch (error) {
    console.error("Failed to fetch DramaBox latest:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch DramaBox latest",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
