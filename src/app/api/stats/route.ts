import { NextResponse } from "next/server";
import { getStatsFromDatabase } from "@/services/card-service";

export async function GET() {
  const summary = await getStatsFromDatabase();
  return NextResponse.json(summary);
}
