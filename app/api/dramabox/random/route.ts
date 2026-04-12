import { NextRequest, NextResponse } from "next/server";
import { adaptDramaBoxDramaList } from "@/lib/adapters/drama";
import {
  dedupeDramaBoxItems,
  extractDramaBoxItemsDeep,
  fetchDramaBoxDubbed,
  fetchDramaBoxHomePage,
  fetchDramaBoxLatest,
  getLang,
  getPage,
} from "../_shared";

const HOMEPAGE_PAGES = [1, 2, 3, 4, 5];
const DUBBED_PAGES = [1, 2, 3, 4];
const PAGE_SIZE = 24;

function seededShuffle<T>(items: T[], seed: number): T[] {
  const copied = [...items];
  let state = seed || 1;

  const random = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }

  return copied;
}

export async function GET(request: NextRequest) {
  try {
    const lang = getLang(request);
    const page = getPage(request, 1);

    const [latestPayload, homepagePayloads, dubbedPayloads] = await Promise.all([
      fetchDramaBoxLatest(lang).catch((error) => {
        console.error("DramaBox latest fetch failed in random pool:", error);
        return null;
      }),
      Promise.all(
        HOMEPAGE_PAGES.map((homepage) =>
          fetchDramaBoxHomePage(homepage, lang).catch((error) => {
            console.error(
              `DramaBox homepage fetch failed in random pool page ${homepage}:`,
              error,
            );
            return null;
          }),
        ),
      ),
      Promise.all(
        DUBBED_PAGES.map((upstreamPage) =>
          fetchDramaBoxDubbed(upstreamPage, lang).catch((error) => {
            console.error(
              `DramaBox dubbed fetch failed in random pool page ${upstreamPage}:`,
              error,
            );
            return null;
          }),
        ),
      ),
    ]);

    const latestItems = latestPayload
      ? extractDramaBoxItemsDeep(latestPayload)
      : [];
    const homepageItems = homepagePayloads.flatMap((raw) =>
      raw ? extractDramaBoxItemsDeep(raw) : [],
    );
    const dubbedItems = dubbedPayloads.flatMap((raw) =>
      raw ? extractDramaBoxItemsDeep(raw) : [],
    );

    const mergedItems = dedupeDramaBoxItems([
      ...homepageItems,
      ...latestItems,
      ...dubbedItems,
    ]);

    const dramas = adaptDramaBoxDramaList(mergedItems).filter(
      (item) => item.id > 0 && item.title.trim().length > 0,
    );

    const randomized = seededShuffle(dramas, 73021);
    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const items = randomized.slice(start, end);
    const hasNextPage = end < randomized.length;

    return NextResponse.json(
      {
        items,
        hasNextPage,
        page,
      },
      { status: 200 },
    );
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
