import { NextResponse } from "next/server";
import { getTodayCardFromDatabase } from "@/services/card-service";

export async function GET() {
  const card = await getTodayCardFromDatabase();
  if (!card) return NextResponse.json({ card: null }, { status: 404 });
  return NextResponse.json(card);
}
