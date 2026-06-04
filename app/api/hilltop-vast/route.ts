import { NextResponse } from "next/server";

const HILLTOP_VAST =
  "https://second-director.com/dam.F/zPdRGFNQvmZiGSUL/SeymC9PuJZNUnlhkIPmTNc/wlNkD/k/woNSTFc/tRN/zIAG0dO/TkAz2iMCQP";

export async function GET() {
  try {
    const res = await fetch(
      `${HILLTOP_VAST}?cb=${Date.now()}&rnd=${Math.random()}&ifa=test&idfa=test&ip=8.8.8.8&ua=ios`,
      {
        cache: "no-store",
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          Referer: "https://dramalotus.site/",
          Origin: "https://dramalotus.site",
        },
      }
    );

    const xml = await res.text();
    console.log("HILLTOP STATUS:", res.status);
    console.log("HILLTOP FINAL URL:", res.url);
    console.log("HILLTOP TYPE:", res.headers.get("content-type"));
    console.log("HILLTOP LENGTH:", xml.length);
    console.log("HILLTOP PREVIEW:", JSON.stringify(xml.slice(0, 500)));

    const mediaMatch = xml.match(
      /<MediaFile[^>]*type="[^"]*mp4[^"]*"[^>]*>([\s\S]*?)<\/MediaFile>/i
    );

    if (!mediaMatch?.[1]) {
      return NextResponse.json(
        {
          ok: false,
          error: "No MP4 found",
          debug: {
            status: res.status,
            finalUrl: res.url,
            contentType: res.headers.get("content-type"),
            length: xml.length,
            preview: xml.slice(0, 1500),
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      url: mediaMatch[1].trim(),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "proxy failed",
      },
      { status: 500 }
    );
  }
}
