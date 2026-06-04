import { NextResponse } from "next/server";

const VAST_URL = "https://s.magsrv.com/v1/vast.php?idzone=5928194";

function extractMp4(xmlText: string): string {
  const mediaMatches = xmlText.match(
    /<MediaFile[^>]*type="[^"]*mp4[^"]*"[^>]*>([\s\S]*?)<\/MediaFile>/i
  );

  if (!mediaMatches?.[1]) {
    return "";
  }

  return mediaMatches[1]
    .replace("<![CDATA[", "")
    .replace("]]>", "")
    .trim();
}

export async function GET() {
  try {
    for (let attempt = 1; attempt <= 5; attempt++) {
      const url =
        `${VAST_URL}` +
        `&cb=${Date.now()}` +
        `&rnd=${Math.random()}` +
        `&try=${attempt}` +
        `&description_url=${encodeURIComponent("https://dramalotus.site/tg")}` +
        `&page_url=${encodeURIComponent("https://dramalotus.site/tg")}`;

      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "user-agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148.0.0.0 Safari/537.36",
          "accept": "*/*",
          "accept-language": "en-US,en;q=0.9,id;q=0.8",
          "cache-control": "no-cache",
          "pragma": "no-cache",
          "referer": "https://dramalotus.site/tg",
          "origin": "https://dramalotus.site",
        },
      });

      const xml = await res.text();
      console.log("EXOCLICK SERVER XML", attempt, xml.slice(0, 400));

      const mp4Url = extractMp4(xml);

      if (mp4Url) {
        return NextResponse.json({
          ok: true,
          mp4Url,
        });
      }
    }

    return NextResponse.json(
      {
        ok: false,
        error: "No MP4 ad found",
      },
      { status: 404 }
    );
  } catch (e) {
    console.error("EXOCLICK SERVER ERROR", e);

    return NextResponse.json(
      {
        ok: false,
        error: "Resolver failed",
      },
      { status: 500 }
    );
  }
}
