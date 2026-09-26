import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  return NextResponse.json({ conversation_id: id, messages: [], count: 0 });
}

export async function DELETE() {
  return NextResponse.json({ ok: true });
}
