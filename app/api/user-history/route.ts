import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const telegramUserIdParam = searchParams.get("telegram_user_id");

  const safeTelegramUserId =
    typeof telegramUserIdParam === "string" &&
    /^\d+$/.test(telegramUserIdParam) &&
    Number(telegramUserIdParam) > 0
      ? telegramUserIdParam
      : null;

  if (!safeTelegramUserId) {
    return NextResponse.json(
      { error: "telegram_user_id must be a valid positive integer" },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("user_history")
    .select("drama_id, episode_id")
    .eq("telegram_user_id", safeTelegramUserId)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch history", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json(
    (data ?? []).map((item) => ({
      dramaId: Number(item.drama_id),
      episodeId: Number(item.episode_id),
    })),
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { telegram_user_id, drama_id, episode_id } = body;

    const safeTelegramUserId =
      typeof telegram_user_id === "number" &&
      Number.isInteger(telegram_user_id) &&
      telegram_user_id > 0
        ? telegram_user_id
        : null;

    const safeDramaId =
      typeof drama_id === "number" && Number.isInteger(drama_id) && drama_id > 0
        ? drama_id
        : null;

    const safeEpisodeId =
      typeof episode_id === "number" &&
      Number.isInteger(episode_id) &&
      episode_id > 0
        ? episode_id
        : null;

    if (!safeTelegramUserId || !safeDramaId || !safeEpisodeId) {
      return NextResponse.json(
        {
          error:
            "telegram_user_id, drama_id, and episode_id must be valid positive integers",
        },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin.from("user_history").upsert(
      {
        telegram_user_id: safeTelegramUserId,
        drama_id: String(safeDramaId),
        episode_id: String(safeEpisodeId),
      },
      { onConflict: "telegram_user_id,drama_id" },
    );

    if (error) {
      console.error("user-history POST error:", error);
      return NextResponse.json(
        { error: "Failed to save history", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 400 },
    );
  }
}
