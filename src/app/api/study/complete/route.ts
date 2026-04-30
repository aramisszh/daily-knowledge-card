import { NextResponse } from "next/server";
import { markLocalCardComplete } from "@/lib/local-data";

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.cardId) return NextResponse.json({ error: "cardId is required" }, { status: 400 });

  try {
    const record = await markLocalCardComplete(body.cardId, body.note ?? null);
    return NextResponse.json({ record });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update record" }, { status: 500 });
  }
}
