import { NextResponse } from "next/server";
import { dedupeDramas, fetchJson, normalize, toErrorResponse } from "../_shared";

export async function GET() {
  try {
    const [explore, dubbing] = await Promise.all([
      fetchJson("/api/v1/explore/1?lang=id_ID"),
      fetchJson("/api/v1/dubbing/1?lang=id_ID"),
    ]);

    const dramas = dedupeDramas([
      ...normalize(explore, "home"),
      ...normalize(dubbing, "home"),
    ]);

    return NextResponse.json(dramas);
  } catch (error) {
    return toErrorResponse(error, "Failed to load Netshort home.");
  }
}
