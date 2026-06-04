import { NextResponse } from "next/server";
import { pinedramaFetch } from "../_shared";

export async function GET() {
  try {
    const payload =
      await pinedramaFetch<any>(
        "/api/drama/categories?language=id&region=ID",
      );

    return NextResponse.json(
      payload?.data?.scenes || [],
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Categories failed",
      },
      { status: 500 },
    );
  }
}
