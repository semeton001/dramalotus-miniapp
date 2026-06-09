import { NextResponse } from "next/server";
import {
  DRAMABOX_TOKEN,
  DRAMABOX_USER_AGENT,
} from "../_shared";

export async function GET() {
  try {
    const response = await fetch(
      "https://captain.sapimu.au/dramaboxbaru/api/categories?lang=in",
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${DRAMABOX_TOKEN}`,
          "User-Agent": DRAMABOX_USER_AGENT,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(
        `DramaBox categories upstream ${response.status}`,
      );
    }

    const payload = await response.json();

    const categories = (
      Array.isArray(payload?.data)
        ? payload.data
        : []
    )
      .map((item: any) => ({
        id: String(item?.id ?? ""),
        name: String(item?.name ?? "").trim(),
      }))
      .filter(
        (item: any) =>
          item.id.length > 0 &&
          item.name.length > 0,
      );

    return NextResponse.json(categories);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat kategori DramaBox.",
      },
      { status: 500 },
    );
  }
}
