import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { PLACE_SELECT, toTouristSite, type PlaceRow } from "@/lib/map-tourist-site";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const supabase = createServerClient();

  const byId = await supabase.from("places").select(PLACE_SELECT).eq("id", id).maybeSingle();
  const row =
    byId.data ||
    (await supabase.from("places").select(PLACE_SELECT).eq("slug", id).maybeSingle()).data;

  if (!row) {
    return NextResponse.json({ detail: "Lieu introuvable" }, { status: 404 });
  }

  return NextResponse.json(toTouristSite(row as PlaceRow));
}
