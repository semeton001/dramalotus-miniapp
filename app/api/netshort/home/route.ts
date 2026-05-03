import { NextResponse } from "next/server";
import { normalizeNetshortFeed } from "@/lib/adapters/drama/netshort";

const NETSHORT_EXPLORE_URL =
  "https://streamapi.web.id/p/netshort/api/v1/explore/1";

const NETSHORT_DUBBING_URL =
  "https://streamapi.web.id/p/netshort/api/v1/dubbing/1";

const NETSHORT_TOKEN = process.env.NETSHORT_TOKEN?.trim() || "";

async function fetchNetshortPayload(baseUrl: string) {
  const upstreamUrl = `${baseUrl}?lang=id_ID&token=${NETSHORT_TOKEN}`;

  const response = await fetch(upstreamUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to load ${upstreamUrl}. status=${response.status}`);
  }

  return response.json();
}

function getPayloadItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: unknown[] }).data;
  }

  return [];
}

function dedupeItemsById(items: unknown[]): unknown[] {
  const map = new Map<string, unknown>();

  for (const item of items) {
    if (!item || typeof item !== "object") continue;

    const rawId = (item as { id?: unknown }).id;
    const id = typeof rawId === "string" || typeof rawId === "number"
      ? String(rawId)
      : JSON.stringify(item);

    if (!map.has(id)) {
      map.set(id, item);
    }
  }

  return Array.from(map.values());
}

export async function GET() {
  try {
    const [explorePayload, dubbingPayload] = await Promise.all([
      fetchNetshortPayload(NETSHORT_EXPLORE_URL),
      fetchNetshortPayload(NETSHORT_DUBBING_URL),
    ]);

    const combinedPayload = {
      code: 200,
      data: dedupeItemsById([
        ...getPayloadItems(explorePayload),
        ...getPayloadItems(dubbingPayload),
      ]),
    };

    const dramas = normalizeNetshortFeed(combinedPayload, "home", "5");

    return NextResponse.json(dramas, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Netshort home.",
      },
      { status: 500 },
    );
  }
}
