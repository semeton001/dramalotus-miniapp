import { NextResponse } from "next/server";
import { fetchJson, errorJson } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function extractItems(payload: any): any[] {
  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.list)) {
    return payload.data.list;
  }

  if (Array.isArray(payload?.data?.items)) {
    return payload.data.items.flatMap((entry: any) =>
      Array.isArray(entry?.items) ? entry.items : [entry]
    );
  }

  return [];
}

export async function GET() {
  try {
    const [popular, free, female] = await Promise.all([
      fetchJson("/api/v1/feed/popular?page=1&lang=id-ID"),
      fetchJson("/api/v1/feed/free?page=1&lang=id-ID"),
      fetchJson("/api/v1/feed/female?page=1&lang=id-ID"),
    ]);

    const merged = [
      ...extractItems(popular),
      ...extractItems(free),
      ...extractItems(female),
    ];

    const seen = new Set<string>();

    const deduped = merged.filter((item: any) => {
      const id = String(
        item?.key ||
        item?.drama_id ||
        item?.id ||
        item?.dramaId ||
        item?.link ||
        ""
      );

      if (!id) return false;
      if (seen.has(id)) return false;

      seen.add(id);
      return true;
    });

    return NextResponse.json({
      code: 200,
      data: deduped,
    });
  } catch (error) {
    return errorJson(error);
  }
}
