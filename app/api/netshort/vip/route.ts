import { NextResponse } from "next/server";
import { dedupeDramas, fetchJson, normalize, toErrorResponse } from "../_shared";

export async function GET() {
  try {
    const [a, b, c] = await Promise.all([
      fetchJson("/api/v1/category/1?region=0&audio=2&tagId=1983832175469740041&lang=id_ID"),
      fetchJson("/api/v1/category/2?region=0&audio=2&tagId=1983832175469740041&lang=id_ID"),
      fetchJson("/api/v1/category/3?region=0&audio=2&tagId=1983832175469740041&lang=id_ID"),
    ]);

    const dramas = dedupeDramas([
      ...normalize(a, "home"),
      ...normalize(b, "home"),
      ...normalize(c, "home"),
    ]);

    return NextResponse.json(dramas);
  } catch (error) {
    return toErrorResponse(error, "Failed to load Netshort vip.");
  }
}
