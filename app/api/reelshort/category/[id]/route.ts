import { NextResponse } from "next/server";
import { adaptReelShortDramas } from "@/lib/adapters/drama/reelshort";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const base =
      process.env.REELSHORT_API_BASE ||
      "https://captain.sapimu.au/reelshort/api/v1";

    const response = await fetch(
      `${base}/feed/${encodeURIComponent(id)}?lang=in`,
      {
        headers: {
          Authorization: `Bearer ${process.env.REELSHORT_BEARER_TOKEN || ""}`,
          "User-Agent": "Mozilla/5.0",
          Referer: "https://captain.sapimu.au/",
          Origin: "https://captain.sapimu.au",
          Accept: "application/json, text/plain, */*",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`ReelShort upstream ${response.status}`);
    }

    const payload = await response.json();

    const books = (
      payload?.data?.lists || []
    ).flatMap((section: any) =>
      Array.isArray(section?.books) ? section.books : [],
    );

    return NextResponse.json(
      adaptReelShortDramas(books),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat kategori ReelShort",
      },
      { status: 500 },
    );
  }
}
