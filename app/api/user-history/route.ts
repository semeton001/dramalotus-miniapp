import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const telegramUserId = searchParams.get("telegram_user_id");

  if (!telegramUserId) {
    return NextResponse.json(
      { error: "telegram_user_id is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("user_history")
    .select("drama_id, episode_id")
    .eq("telegram_user_id", telegramUserId)
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

    if (!telegram_user_id || !drama_id || !episode_id) {
      return NextResponse.json(
        { error: "telegram_user_id, drama_id, and episode_id are required" },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("user_history")
      .upsert(
        {
          telegram_user_id,
          drama_id: String(drama_id),
          episode_id: String(episode_id),
        },
        { onConflict: "telegram_user_id,drama_id" },
      );

    if (error) {
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