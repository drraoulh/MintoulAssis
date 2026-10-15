import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { PLACE_SELECT, toTouristSite, type PlaceRow } from "@/lib/map-tourist-site";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const supabase = createServerClient();

  let query = supabase
    .from("places")
    .select(PLACE_SELECT)
    .not("lat", "is", null)
    .order("likes_count", { ascending: false, nullsFirst: false })
    .limit(40);

  if (city) query = query.ilike("city", `%${city}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ items: [], count: 0 }, { status: 200 });
  }

  const items = (data as PlaceRow[]).map(toTouristSite);
  return NextResponse.json({ items, count: items.length });
}
