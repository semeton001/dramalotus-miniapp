import { respondCombinedDramaFeed } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return respondCombinedDramaFeed(
    [
      "https://reelshort.dramabos.my.id/home?tab=populer&lang=in",
      "https://reelshort.dramabos.my.id/home?tab=terbaru&lang=in",
    ],
    1,
  );
}