import { NextResponse } from "next/server";

import { normalizeDramawaveFeed } from "@/lib/adapters/drama/dramawave";

const HOME_URL = "https://dramawave.dramabos.my.id/api/home?lang=in";
const FORYOU_URL = "https://dramawave.dramabos.my.id/api/recommend?lang=in&next=";
const ANIME_URL = "https://dramawave.dramabos.my.id/api/anime?lang=in&next=";

function shuffle<T>(list: T[]): T[] {
  const cloned = [...list];

  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[randomIndex]] = [cloned[randomIndex], cloned[index]];
  }

  return cloned;
}

export async function GET() {
  try {
    const [homeRes, foryouRes, animeRes] = await Promise.all([
      fetch(HOME_URL, { cache: "no-store" }),
      fetch(FORYOU_URL, { cache: "no-store" }),
      fetch(ANIME_URL, { cache: "no-store" }),
    ]);

    if (!homeRes.ok || !foryouRes.ok || !animeRes.ok) {
      return NextResponse.json(
        {
          error: `Gagal memuat Acak Dramawave. home=${homeRes.status} foryou=${foryouRes.status} anime=${animeRes.status}`,
        },
        { status: 502 },
      );
    }

    const [homePayload, foryouPayload, animePayload] = await Promise.all([
      homeRes.json(),
      foryouRes.json(),
      animeRes.json(),
    ]);

    const merged = [
      ...normalizeDramawaveFeed(homePayload, "random"),
      ...normalizeDramawaveFeed(foryouPayload, "random"),
      ...normalizeDramawaveFeed(animePayload, "random"),
    ];

    const deduped = Array.from(
      new Map(merged.map((drama) => [drama.slug || String(drama.id), drama])).values(),
    );

    return NextResponse.json(shuffle(deduped));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat Acak Dramawave.",
      },
      { status: 500 },
    );
  }
}
