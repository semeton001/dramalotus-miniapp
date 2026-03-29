import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { telegram_user_id, telegram_username } = body;

    if (!telegram_user_id) {
      return NextResponse.json(
        { error: "telegram_user_id is required" },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .upsert(
        {
          telegram_user_id,
          telegram_username: telegram_username ?? null,
        },
        {
          onConflict: "telegram_user_id",
        },
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to save user profile", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
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