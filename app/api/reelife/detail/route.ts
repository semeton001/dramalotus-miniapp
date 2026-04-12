import { NextRequest, NextResponse } from "next/server";
import { adaptReelifeDrama, collectReelifeCode, getLang, getString, reelifeFetch } from "../_shared";
import type { ReelifeBookDetailResponse } from "../_shared";

export async function GET(req: NextRequest) {
  try {
    const dramaId = getString(req.nextUrl.searchParams.get("dramaId"));
    const lang = getLang(req);

    if (!dramaId) {
      return NextResponse.json({ error: "Missing dramaId" }, { status: 400 });
    }

    const payload = await reelifeFetch<ReelifeBookDetailResponse>(`/api/v1/book/${dramaId}?lang=${lang}`);
    const drama = adaptReelifeDrama({
      ...payload?.data?.bookVo,
      code: collectReelifeCode(payload, payload?.data?.bookVo),
    });

    return NextResponse.json(drama);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown Reelife detail error" },
      { status: 500 },
    );
  }
}
