import { NextResponse } from "next/server";
import { getTodayLocalCard } from "@/lib/local-data";

export async function GET() {
  const card = await getTodayLocalCard();
  if (!card) return NextResponse.json({ card: null }, { status: 404 });
  return NextResponse.json(card);
}
