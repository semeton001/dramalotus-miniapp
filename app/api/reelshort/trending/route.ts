import { respondDramaFeed } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return respondDramaFeed(
    "https://reelshort.dramabos.my.id/trending?lang=in",
    1,
  );
}