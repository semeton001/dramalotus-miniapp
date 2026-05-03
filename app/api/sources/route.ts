import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

async function fetchSourcesWithRetry(retries = 1) {
  const result = await supabaseServer
    .from("sources")
    .select("*")
    .order("sort_order", { ascending: true });

  if (!result.error) return result;

  if (retries > 0) {
    console.warn("Retrying sources fetch after error:", result.error.message);
    return fetchSourcesWithRetry(retries - 1);
  }

  return result;
}

export async function GET() {
  const { data, error } = await fetchSourcesWithRetry(1);

  if (error) {
    console.error("Sources API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mapped = (data ?? []).map((item) => {
    const slug = String(item.slug || "").toLowerCase();
    const name = String(item.name || "").toLowerCase();
    const isDramaNova = slug === "dramanova" || name === "dramanova";
    const isBiliTV = slug === "bilitv" || name === "bilitv";

    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      badge: item.badge,
      description: item.description,
      logo: isBiliTV
        ? "/sources/bilitv-v1.png"
        : isDramaNova
          ? "/sources/dramanova-v1.png"
          : item.logo,
      cardClass: item.card_class,
      sortOrder: item.sort_order,
      isPopular: item.is_popular,
    };
  });

  const hasDramaBite = mapped.some(
    (item) =>
      String(item.slug || "").toLowerCase() === "dramabite" ||
      String(item.name || "").toLowerCase() === "dramabite",
  );

  if (!hasDramaBite) {
    mapped.push({
      id: "13",
      name: "DramaBite",
      slug: "dramabite",
      badge: "NEW",
      description: "Source drama pendek dengan episode HLS.",
      logo: "/sources/dramabite.png",
      cardClass: "from-[#FF3B30]/20 via-[#FF6B35]/10 to-[#111827]",
      sortOrder: 13,
      isPopular: false,
    });
  }

  const hasFlexTV = mapped.some(
    (item) =>
      String(item.slug || "").toLowerCase() === "flextv" ||
      String(item.name || "").toLowerCase() === "flextv",
  );

  if (!hasFlexTV) {
    mapped.push({
      id: "14",
      name: "FlexTV",
      slug: "flextv",
      badge: "NEW",
      description: "Source drama pendek FlexTV dengan episode MP4.",
      logo: "/sources/flextv.png",
      cardClass: "from-[#22C55E]/20 via-[#14B8A6]/10 to-[#111827]",
      sortOrder: 14,
      isPopular: false,
    });
  }

  const hasStardustTV = mapped.some(
    (item) =>
      String(item.slug || "").toLowerCase() === "stardusttv" ||
      String(item.name || "").toLowerCase() === "stardusttv",
  );

  if (!hasStardustTV) {
    mapped.push({
      id: "15",
      name: "StardustTV",
      slug: "stardusttv",
      badge: "NEW",
      description: "Source drama pendek StardustTV dengan episode HLS.",
      logo: "/sources/stardusttv.png",
      cardClass: "from-[#8B5CF6]/20 via-[#EC4899]/10 to-[#111827]",
      sortOrder: 15,
      isPopular: false,
    });
  }

  const hasFunDrama = mapped.some(
    (item) =>
      String(item.slug || "").toLowerCase() === "fundrama" ||
      String(item.name || "").toLowerCase() === "fundrama",
  );

  if (!hasFunDrama) {
    mapped.push({
      id: "13",
      name: "FunDrama",
      slug: "fundrama",
      badge: "NEW",
      description: "Source drama pendek FunDrama dengan episode MP4.",
      logo: "/sources/fundrama.png",
      cardClass: "from-[#F43F5E]/20 via-[#F97316]/10 to-[#111827]",
      sortOrder: 13,
      isPopular: false,
    });
  }

  const hasMicroDrama = mapped.some(
    (item) =>
      String(item.slug || "").toLowerCase() === "microdrama" ||
      String(item.name || "").toLowerCase() === "microdrama",
  );

  if (!hasMicroDrama) {
    mapped.push({
      id: "14",
      name: "MicroDrama",
      slug: "microdrama",
      badge: "NEW",
      description: "Source drama pendek MicroDrama dengan episode MP4.",
      logo: "/sources/microdrama.png",
      cardClass: "from-[#06B6D4]/20 via-[#2563EB]/10 to-[#111827]",
      sortOrder: 14,
      isPopular: false,
    });
  }

  const hasDramapops = mapped.some(
    (item) =>
      String(item.slug || "").toLowerCase() === "dramapops" ||
      String(item.name || "").toLowerCase() === "dramapops",
  );

  if (!hasDramapops) {
    mapped.push({
      id: "18",
      name: "Dramapops",
      slug: "dramapops",
      badge: "NEW",
      description: "Source drama pendek Dramapops dengan episode multi-quality.",
      logo: "/sources/dramapops.png",
      cardClass: "from-[#A855F7]/20 via-[#EC4899]/10 to-[#111827]",
      sortOrder: 18,
      isPopular: false,
    });
  }

  const hasDramaNova = mapped.some(
    (item) =>
      String(item.slug || "").toLowerCase() === "dramanova" ||
      String(item.name || "").toLowerCase() === "dramanova",
  );

  if (!hasDramaNova) {
    mapped.push({
      id: "19",
      name: "DramaNova",
      slug: "dramanova",
      badge: "NEW",
      description: "Source drama pendek DramaNova dengan episode MP4.",
      logo: "/sources/dramanova-v1.png",
      cardClass: "from-[#6366F1]/20 via-[#EC4899]/10 to-[#111827]",
      sortOrder: 19,
      isPopular: false,
    });
  }

  const hasBiliTV = mapped.some(
    (item) =>
      String(item.slug || "").toLowerCase() === "bilitv" ||
      String(item.name || "").toLowerCase() === "bilitv",
  );

  if (!hasBiliTV) {
    mapped.push({
      id: "20",
      name: "BiliTV",
      slug: "bilitv",
      badge: "NEW",
      description: "Source drama pendek BiliTV dengan episode HLS.",
      logo: "/sources/bilitv-v1.png",
      cardClass: "from-[#00A3FF]/20 via-[#6D5DFB]/10 to-[#111827]",
      sortOrder: 20,
      isPopular: false,
    });
  }

  mapped.sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

  return NextResponse.json(mapped);
}