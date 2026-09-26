import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { PLACE_SELECT, toTouristSite, type PlaceRow } from "@/lib/map-tourist-site";
import { REGIONS } from "@/lib/regions";

export const dynamic = "force-dynamic";

/** Map friendly / legacy category aliases to DB values. */
function resolveCategory(raw: string | null): string | null {
  if (!raw) return null;
  const c = raw.trim().toLowerCase();
  if (!c || c === "all" || c === "tous") return null;
  if (/^sites?$|touris|nature|culture|heritage|parc|plage|beach|activity|patrimoine/.test(c)) {
    return "sites-touristiques";
  }
  if (/restaur|food|gastro|cuisine/.test(c)) return "restauration";
  if (/hotel|héberg|heberg|lodg/.test(c)) return "hotels-et-hebergements";
  if (/transport/.test(c)) return "transports";
  return raw.trim();
}

function resolveRegionSlug(raw: string | null): string | null {
  if (!raw) return null;
  const n = raw.trim().toLowerCase();
  const hit = REGIONS.find(
    (r) =>
      r.apiRegion.toLowerCase() === n ||
      r.nameFr.toLowerCase() === n ||
      r.nameEn.toLowerCase() === n ||
      r.id === n,
  );
  return hit?.id ?? null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const region = searchParams.get("region");
  const category = resolveCategory(searchParams.get("category"));
  const q = searchParams.get("q")?.trim() || null;
  const excludeHotels = searchParams.get("exclude_hotels") !== "0";
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 48), 1), 120);

  const supabase = createServerClient();
  const regionSlug = resolveRegionSlug(region);

  let regionId: string | null = null;
  if (regionSlug) {
    const { data: regionRow } = await supabase
      .from("regions")
      .select("id")
      .eq("slug", regionSlug)
      .maybeSingle();
    regionId = regionRow?.id ?? null;
  } else if (region) {
    const { data: regionRow } = await supabase
      .from("regions")
      .select("id")
      .ilike("name", `%${region}%`)
      .limit(1)
      .maybeSingle();
    regionId = regionRow?.id ?? null;
  }

  let query = supabase
    .from("places")
    .select(PLACE_SELECT)
    .order("likes_count", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (city) query = query.ilike("city", `%${city}%`);
  if (category) query = query.eq("category", category);
  else if (excludeHotels) query = query.neq("category", "hotels-et-hebergements");
  if (regionId) query = query.eq("region_id", regionId);
  if (q) query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,short_description.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ items: [], count: 0, error: error.message }, { status: 200 });
  }

  const items = (data as PlaceRow[]).map(toTouristSite);

  // Region counts for the 10 official regions (non-hotel places) — lightweight heads.
  const counts: Record<string, number> = {};
  if (searchParams.get("with_counts") === "1") {
    await Promise.all(
      REGIONS.map(async (r) => {
        const { data: row } = await supabase
          .from("regions")
          .select("id")
          .eq("slug", r.id)
          .maybeSingle();
        if (!row?.id) {
          counts[r.id] = 0;
          return;
        }
        const { count } = await supabase
          .from("places")
          .select("id", { count: "exact", head: true })
          .eq("region_id", row.id)
          .eq("category", "sites-touristiques");
        counts[r.id] = count ?? 0;
      }),
    );
  }

  return NextResponse.json({
    items,
    count: items.length,
    ...(searchParams.get("with_counts") === "1" ? { region_counts: counts } : {}),
  });
}
