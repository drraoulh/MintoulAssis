import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ items: [], count: 0, persistent: false });
}
