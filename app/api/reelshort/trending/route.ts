import { respondCombinedDramaFeed } from "../_shared";

export const dynamic = "auto";
export const revalidate = 30;

function getReelShortCode() {
  return process.env.REELSHORT_DEFAULT_CODE?.trim() || "";
}

export async function GET() {
  const code = getReelShortCode();

  return respondCombinedDramaFeed(
    [
      `https://streamapi.web.id/p/reelshort/api/v1/completed?lang=in&token=${encodeURIComponent(code)}`,
    ],
    1,
  );
}
