import { NextRequest, NextResponse } from "next/server";
import { adaptDramaBoxDramaList } from "@/lib/adapters/drama";
import {
  dedupeDramaBoxItems,
  enrichDramaBoxDramaMeta,
  extractDramaBoxItemsDeep,
  fetchDramaBoxForYou,
  fetchDramaBoxHomePage,
  fetchDramaBoxRanking,
  getLang,
  getPage,
} from "../_shared";

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

    const [homePayload, rankingPayload, forYouPayload] = await Promise.all([
      fetchDramaBoxHomePage(1, lang).catch(() => null),
      fetchDramaBoxRanking(lang).catch(() => null),
      fetchDramaBoxForYou(lang).catch(() => null),
    ]);

    const rawItems = dedupeDramaBoxItems([
      ...(homePayload ? extractDramaBoxItemsDeep(homePayload) : []),
      ...(rankingPayload ? extractDramaBoxItemsDeep(rankingPayload) : []),
      ...(forYouPayload ? extractDramaBoxItemsDeep(forYouPayload) : []),
    ]);

    const adapted = adaptDramaBoxDramaList(rawItems).filter(
      (item) => item.id > 0 && item.title.trim().length > 0,
    );

    const mergedItems = enrichDramaBoxDramaMeta(adapted, rawItems);
    const randomized = seededShuffle(mergedItems, Date.now() % 100000);

    return NextResponse.json(
      {
        items: randomized,
        hasNextPage: false,
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
