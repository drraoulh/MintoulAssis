import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createServerClient();
    const { count, error } = await supabase
      .from("places")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json({
        status: "degraded",
        service: "webmintoul",
        message: error.message,
      });
    }

    return NextResponse.json({
      status: "ok",
      service: "webmintoul",
      places: count ?? 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "offline",
        service: "webmintoul",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
