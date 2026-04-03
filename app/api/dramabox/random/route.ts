import { NextResponse } from "next/server";
import { adaptDramaBoxDramaList } from "@/lib/adapters/drama";
import type { DramaBoxDramaResponse } from "@/lib/adapters/drama/dramabox";

const DRAMABOX_BASE_URL = "https://dramabox.dramabos.my.id/api/v1";
const DRAMABOX_LANG = "in";
const HOMEPAGE_PAGES = [1, 2, 3, 4, 5];
const DUBBED_PAGES = [1, 2, 3, 4];
const RANDOM_LIMIT = 48;

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

async function fetchDramaBoxHomePage(page: number) {
  return fetchJson(
    `${DRAMABOX_BASE_URL}/homepage?page=${page}&lang=${DRAMABOX_LANG}`,
  );
}

async function fetchDramaBoxLatest() {
  return fetchJson(`${DRAMABOX_BASE_URL}/latest?lang=${DRAMABOX_LANG}`);
}

async function fetchDramaBoxDubbed(page: number) {
  return fetchJson(
    `${DRAMABOX_BASE_URL}/dubbed?classify=terpopuler&page=${page}&lang=${DRAMABOX_LANG}`,
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

function shuffle<T>(items: T[]): T[] {
  const copied = [...items];

  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }

  return copied;
}

export async function GET() {
  try {
    const [latestPayload, homepagePayloads, dubbedPayloads] = await Promise.all(
      [
        fetchDramaBoxLatest().catch((error) => {
          console.error("DramaBox latest fetch failed in random pool:", error);
          return null;
        }),
        Promise.all(
          HOMEPAGE_PAGES.map((page) =>
            fetchDramaBoxHomePage(page).catch((error) => {
              console.error(
                `DramaBox homepage fetch failed in random pool page ${page}:`,
                error,
              );
              return null;
            }),
          ),
        ),
        Promise.all(
          DUBBED_PAGES.map((page) =>
            fetchDramaBoxDubbed(page).catch((error) => {
              console.error(
                `DramaBox dubbed fetch failed in random pool page ${page}:`,
                error,
              );
              return null;
            }),
          ),
        ),
      ],
    );

    const latestItems = latestPayload
      ? extractDramaBoxItemsDeep(latestPayload)
      : [];

    const homepageItems = homepagePayloads.flatMap((raw, index) => {
      if (!raw) return [];
      const page = HOMEPAGE_PAGES[index];
      const items = extractDramaBoxItemsDeep(raw);
      console.log(
        `DramaBox random homepage page ${page} extracted:`,
        items.length,
      );
      return items;
    });

    const dubbedItems = dubbedPayloads.flatMap((raw, index) => {
      if (!raw) return [];
      const page = DUBBED_PAGES[index];
      const items = extractDramaBoxItemsDeep(raw);
      console.log(
        `DramaBox random dubbed page ${page} extracted:`,
        items.length,
      );
      return items;
    });

    const mergedItems = dedupeDramaBoxItems([
      ...homepageItems,
      ...latestItems,
      ...dubbedItems,
    ]);

    console.log("DramaBox random homepage total:", homepageItems.length);
    console.log("DramaBox random latest total:", latestItems.length);
    console.log("DramaBox random dubbed total:", dubbedItems.length);
    console.log("DramaBox random deduped total:", mergedItems.length);

    const dramas = adaptDramaBoxDramaList(mergedItems).filter(
      (item) => item.id > 0 && item.title.trim().length > 0,
    );

    const shuffled = shuffle(dramas);
    const limited = shuffled.slice(0, RANDOM_LIMIT);

    console.log("DramaBox random final limited total:", limited.length);

    return NextResponse.json(limited);
  } catch (error) {
    console.error("Failed to fetch DramaBox random:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch DramaBox random",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
