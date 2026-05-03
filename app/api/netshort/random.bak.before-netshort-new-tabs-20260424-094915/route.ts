import { NextResponse } from "next/server";
import { normalizeNetshortFeed } from "@/lib/adapters/drama/netshort";

const NETSHORT_HOME_URL = "https://netshort.dramabos.my.id/api/home/1?lang=in";

function shuffleArray<T>(items: T[]): T[] {
  const cloned = [...items];

  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }

  return cloned;
}

export async function GET() {
  try {
    const response = await fetch(NETSHORT_HOME_URL, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");

      return NextResponse.json(
        {
          error: `Failed to load Netshort random feed. status=${response.status}`,
          body,
        },
        { status: response.status },
      );
    }

    const payload = await response.json();
    const normalized = normalizeNetshortFeed(payload, "random", "5");
    const shuffled = shuffleArray(normalized);

    return NextResponse.json(shuffled, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Netshort random feed.",
      },
      { status: 500 },
    );
  }
}