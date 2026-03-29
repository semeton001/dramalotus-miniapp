import { NextResponse } from "next/server";
import sourcesData from "@/data/sources.json";
import type { Source } from "@/types/source";

export async function GET() {
  const sources = (sourcesData as Source[]).sort(
    (a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999),
  );

  return NextResponse.json(sources);
}