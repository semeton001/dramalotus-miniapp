import { NextResponse } from "next/server";
import {
  FLICKREELS_TOKEN,
  jsonError,
} from "../_shared";

export async function GET() {
  try {
    const response = await fetch(
      "https://captain.sapimu.au/flickreels/api/navigation?lang=id",
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
      throw new Error(`Navigation upstream ${response.status}`);
    }

    const payload = await response.json();

    const categories = (Array.isArray(payload) ? payload : [])
      .map((item: any) => ({
        categoryId: String(item?.id ?? ""),
        name: String(item?.name ?? "").trim(),
      }))
      .filter(
        (item: any) =>
          item.categoryId.length > 0 &&
          item.name.length > 0,
      );

    return NextResponse.json(categories);
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal memuat kategori FlickReels.",
    );
  }
}
