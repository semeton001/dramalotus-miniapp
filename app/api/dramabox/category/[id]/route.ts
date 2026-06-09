import { NextRequest, NextResponse } from "next/server";
import {
  DRAMABOX_TOKEN,
  DRAMABOX_USER_AGENT,
} from "../../_shared";
import {
  normalizeDramaBoxBrowseFeed,
} from "@/lib/adapters/drama/dramabox";

export async function GET(
  req: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const page =
      req.nextUrl.searchParams.get("page") || "1";

    const { id } = await context.params;

    const categoryId = id || "0";

    const upstream =
      `https://captain.sapimu.au/dramaboxbaru/api/browse?lang=in&type=${encodeURIComponent(
        categoryId,
      )}&page=${encodeURIComponent(page)}`;

    const response = await fetch(upstream, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${DRAMABOX_TOKEN}`,
        "User-Agent": DRAMABOX_USER_AGENT,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `DramaBox browse upstream ${response.status}`,
      );
    }

    const payload = await response.json();

    return NextResponse.json(
      normalizeDramaBoxBrowseFeed(payload),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat kategori DramaBox.",
      },
      {
        status: 500,
      },
    );
  }
}
