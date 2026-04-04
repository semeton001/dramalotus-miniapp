import { NextResponse } from "next/server";
import { loadNetshortHomeFeed, shuffle } from "../_shared";

export async function GET() {
  const home = await loadNetshortHomeFeed("5");

  return NextResponse.json(
    shuffle(
      home.map((item, index) => ({
        ...item,
        badge: "Acak",
        sortOrder: index,
      })),
    ),
  );
}