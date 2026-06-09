import { NextRequest, NextResponse } from "next/server";
import {
  FLICKREELS_TOKEN,
  jsonError,
} from "../../_shared";
import { normalizeFlickreelsFeed } from "@/lib/adapters/drama/flickreels";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const response = await fetch(
      `https://captain.sapimu.au/flickreels/api/category/${id}?page=1&lang=id`,
      {
        headers: {
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",

          Authorization: `Bearer ${FLICKREELS_TOKEN}`,

          Referer: "https://captain.sapimu.au/",
          Origin: "https://captain.sapimu.au",

          "X-Requested-With": "XMLHttpRequest",

          "device-id": "dramalotus-web",
          "app-version": "1.0.0",

          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Category upstream ${response.status}`);
    }

    const payload = await response.json();

    return NextResponse.json(
      normalizeFlickreelsFeed(
        payload?.list || [],
        "home",
        "6",
      ),
    );
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal memuat kategori FlickReels.",
    );
  }
}
