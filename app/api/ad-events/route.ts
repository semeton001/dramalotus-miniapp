import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ALLOWED_EVENT_TYPES = new Set([
  "impression",
  "skip",
  "complete",
  "click",
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const requestId =
      typeof body?.requestId === "string" ? body.requestId.trim() : "";
    const campaignId =
      typeof body?.campaignId === "string" ? body.campaignId.trim() : "";
    const eventType =
      typeof body?.eventType === "string" ? body.eventType.trim() : "";
    const placement =
      typeof body?.placement === "string" ? body.placement.trim() : "";
    const membership =
      typeof body?.membership === "string" ? body.membership.trim() : "";
    const dramaId =
      typeof body?.dramaId === "number" && Number.isFinite(body.dramaId)
        ? body.dramaId
        : null;
    const episodeNumber =
      typeof body?.episodeNumber === "number" &&
      Number.isFinite(body.episodeNumber)
        ? body.episodeNumber
        : null;
    const ctaLabel =
      typeof body?.ctaLabel === "string" && body.ctaLabel.trim().length > 0
        ? body.ctaLabel.trim()
        : null;
    const ctaUrl =
      typeof body?.ctaUrl === "string" && body.ctaUrl.trim().length > 0
        ? body.ctaUrl.trim()
        : null;
    const eventTimestamp =
      typeof body?.timestamp === "string" && body.timestamp.trim().length > 0
        ? body.timestamp.trim()
        : new Date().toISOString();

    if (!requestId || !campaignId || !eventType || !placement || !membership) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing required ad event fields",
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_EVENT_TYPES.has(eventType)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported ad event type",
        },
        { status: 400 },
      );
    }

    const normalizedEvent = {
      requestId,
      campaignId,
      eventType,
      placement,
      membership,
      dramaId,
      episodeNumber,
      ctaLabel,
      ctaUrl,
      eventTimestamp,
    };

    const { error } = await supabaseAdmin.from("ad_events").insert({
      request_id: normalizedEvent.requestId,
      campaign_id: normalizedEvent.campaignId,
      event_type: normalizedEvent.eventType,
      placement: normalizedEvent.placement,
      membership: normalizedEvent.membership,
      drama_id:
        normalizedEvent.dramaId !== null
          ? String(normalizedEvent.dramaId)
          : null,
      episode_number: normalizedEvent.episodeNumber,
      cta_label: normalizedEvent.ctaLabel,
      cta_url: normalizedEvent.ctaUrl,
      event_timestamp: normalizedEvent.eventTimestamp,
    });

    if (error) {
      console.error("ad-events POST error:", error);

      return NextResponse.json(
        {
          ok: false,
          error: "Failed to persist ad event",
          details: error.message,
        },
        { status: 500 },
      );
    }

    console.log("AD EVENT NORMALIZED:", normalizedEvent);

    return NextResponse.json(
      {
        ok: true,
        event: normalizedEvent,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Gagal membaca ad event:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Invalid ad event payload",
      },
      { status: 400 },
    );
  }
}
