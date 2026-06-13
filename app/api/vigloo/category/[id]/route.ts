import { NextRequest, NextResponse } from "next/server";
import {
  buildViglooApiUrl,
  VIGLOO_HEADERS,
} from "../../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const { id } = await context.params;

    // Ranking tab tidak punya section sendiri.
    // Cari ranking bundle dari tab Populer.
    if (id === "15000142") {
      const rankingTabResponse = await fetch(
        buildViglooApiUrl(
          "/vigloo/api/v1/tabs/15000101?lang=id",
        ),
        {
          cache: "no-store",
          headers: VIGLOO_HEADERS,
        },
      );

      const rankingTabJson =
        await rankingTabResponse.json();

      const rankingSection =
        Array.isArray(rankingTabJson?.payloads)
          ? rankingTabJson.payloads.find(
              (x: any) =>
                x?.uiType === "RANKING",
            )
          : null;

      if (!rankingSection?.id) {
        return NextResponse.json([]);
      }

      const bundleResponse = await fetch(
        buildViglooApiUrl(
          `/vigloo/api/v1/bundles/${rankingSection.id}?lang=id`,
        ),
        {
          cache: "no-store",
          headers: VIGLOO_HEADERS,
        },
      );

      const bundleJson =
        await bundleResponse.json();

      const payloads = Array.isArray(
        bundleJson?.payloads,
      )
        ? bundleJson.payloads
        : [];

      const dramas = payloads.map(
        (item: any) => {
          const program =
            item.program || item;

          return {
            id: Number(program.id),

            title:
              program.title || "",

            description:
              program.logLine ||
              program.subTitle ||
              "",

            thumbnail:
              program.thumbnail ||
              program.thumbnailExpanded ||
              program.bannerImage ||
              "",

            posterImage:
              program.thumbnail ||
              program.thumbnailExpanded ||
              program.bannerImage ||
              "",

            coverImage:
              program.thumbnail ||
              program.thumbnailExpanded ||
              program.bannerImage ||
              "",

            source: "vigloo",
            sourceName: "Vigloo",

            slug: `vigloo-${program.id}`,

            episodeCount:
              program.episodeCount || 0,

            viglooDramaId: String(
              program.id,
            ),

            viglooSeasonId:
              program?.seasons?.[0]?.id
                ? String(
                    program.seasons[0].id,
                  )
                : "",
          };
        },
      );

      return NextResponse.json(dramas);
    }

    const tabResponse = await fetch(
      buildViglooApiUrl(
        `/vigloo/api/v1/tabs/${id}?lang=id`,
      ),
      {
        cache: "no-store",
        headers: VIGLOO_HEADERS,
      },
    );

    if (!tabResponse.ok) {
      throw new Error(
        `Tabs failed (${tabResponse.status})`,
      );
    }

    const tabJson = await tabResponse.json();

    const firstSection =
      tabJson?.payloads?.[0];

    if (!firstSection?.id) {
      return NextResponse.json([]);
    }

    const bundleResponse = await fetch(
      buildViglooApiUrl(
        `/vigloo/api/v1/bundles/${firstSection.id}?lang=id`,
      ),
      {
        cache: "no-store",
        headers: VIGLOO_HEADERS,
      },
    );

    if (!bundleResponse.ok) {
      throw new Error(
        `Bundle failed (${bundleResponse.status})`,
      );
    }

    const bundleJson =
      await bundleResponse.json();

    const payloads = Array.isArray(
      bundleJson?.payloads,
    )
      ? bundleJson.payloads
      : [];

    const dramas = payloads.map(
      (item: any) => {
        const program =
          item.program || item;

        return {
          id: Number(program.id),

          title:
            program.title || "",

          description:
            program.logLine ||
            program.subTitle ||
            "",

          thumbnail:
            program.thumbnail ||
            program.thumbnailExpanded ||
            program.bannerImage ||
            "",

          posterImage:
            program.thumbnail ||
            program.thumbnailExpanded ||
            program.bannerImage ||
            "",

          coverImage:
            program.thumbnail ||
            program.thumbnailExpanded ||
            program.bannerImage ||
            "",

          source: "vigloo",
          sourceName: "Vigloo",

          slug: `vigloo-${program.id}`,

          episodeCount:
            program.episodeCount || 0,

          viglooDramaId: String(
            program.id,
          ),

          viglooSeasonId:
            program?.seasons?.[0]?.id
              ? String(
                  program.seasons[0].id,
                )
              : "",
        };
      },
    );

    return NextResponse.json(dramas);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      },
    );
  }
}
