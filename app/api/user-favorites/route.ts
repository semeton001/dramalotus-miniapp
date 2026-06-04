import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: Request) {
  const currentUser = await getCurrentUser();

  const url = new URL(request.url);
  const queryTelegramUserId = url.searchParams.get("telegram_user_id");

  const safeTelegramUserId =
    currentUser?.telegram_user_id
      ? String(currentUser.telegram_user_id)
      : queryTelegramUserId;

  if (!safeTelegramUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("user_favorites")
    .select("drama_id")
    .eq("telegram_user_id", safeTelegramUserId);

  if (error) {
    console.error("user-favorites POST error:", error);
    return NextResponse.json(
      { error: "Failed to save favorite", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json((data ?? []).map((item) => Number(item.drama_id)));
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    const body = await request.json();
    const { telegram_user_id, drama_id } = body;

    const safeTelegramUserId =
      currentUser?.telegram_user_id ??
      (typeof telegram_user_id === "number" ? telegram_user_id : null);

    if (!safeTelegramUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      currentUser?.telegram_user_id &&
      telegram_user_id &&
      telegram_user_id !== currentUser.telegram_user_id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const safeDramaId =
      typeof drama_id === "number" && Number.isInteger(drama_id) && drama_id > 0
        ? drama_id
        : null;

    if (!safeTelegramUserId || !safeDramaId) {
      return NextResponse.json(
        {
          error:
            "telegram_user_id and drama_id must be valid positive integers",
        },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin.from("user_favorites").upsert(
      {
        telegram_user_id: safeTelegramUserId,
        drama_id: String(safeDramaId),
      },
      { onConflict: "telegram_user_id,drama_id" },
    );

    if (error) {
      return NextResponse.json(
        { error: "Failed to save favorite", details: error.message },
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

export async function DELETE(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    const body = await request.json();
    const { telegram_user_id, drama_id } = body;

    const safeTelegramUserId =
      currentUser?.telegram_user_id ??
      (typeof telegram_user_id === "number" ? telegram_user_id : null);

    if (!safeTelegramUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (
      currentUser?.telegram_user_id &&
      telegram_user_id &&
      telegram_user_id !== currentUser.telegram_user_id
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const safeDramaId =
      typeof drama_id === "number" && Number.isInteger(drama_id) && drama_id > 0
        ? drama_id
        : null;

    if (!safeTelegramUserId || !safeDramaId) {
      return NextResponse.json(
        {
          error:
            "telegram_user_id and drama_id must be valid positive integers",
        },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("user_favorites")
      .delete()
      .eq("telegram_user_id", safeTelegramUserId)
      .eq("drama_id", String(safeDramaId));

    if (error) {
      return NextResponse.json(
        { error: "Failed to remove favorite", details: error.message },
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
