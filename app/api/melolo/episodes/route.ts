import { NextRequest } from "next/server";
import { respondEpisodes } from "../_shared";

export async function GET(request: NextRequest) {
  return respondEpisodes(request);
}
