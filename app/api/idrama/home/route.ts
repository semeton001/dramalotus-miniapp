import { NextResponse } from "next/server";
import {
  extractHomeChannelKeys,
  fetchIdramaJson,
  flattenTabModulesToDramas,
} from "../_shared";

export async function GET() {
  try {
    const homePayload = await fetchIdramaJson("/home");
    const channelKeys = extractHomeChannelKeys(homePayload);

    const settled = await Promise.allSettled(
      channelKeys.map((key) => fetchIdramaJson(`/tab/${key}`)),
    );

    const merged = settled.flatMap((result) => {
      if (result.status !== "fulfilled") return [];
      return flattenTabModulesToDramas(result.value, "iDrama");
    });

    const deduped = new Map<string, (typeof merged)[number]>();
    merged.forEach((drama) => {
      const key =
        drama.idramaDramaId ||
        drama.idramaRawId ||
        drama.slug ||
        String(drama.id);
      deduped.set(key, drama);
    });

    return NextResponse.json(Array.from(deduped.values()));
  } catch (error) {
    console.error("iDrama home route error:", error);
    return NextResponse.json(
      { error: "Failed to load iDrama home." },
      { status: 500 },
    );
  }
}
