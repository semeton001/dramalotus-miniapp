import { NextResponse } from "next/server";
import dramasData from "@/data/dramas.json";
import type { Drama } from "@/types/drama";

export async function GET() {
  const dramas = (dramasData as Drama[]).sort(
    (a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999),
  );

  return NextResponse.json(dramas);
}