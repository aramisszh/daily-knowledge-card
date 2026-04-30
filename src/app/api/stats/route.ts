import { NextResponse } from "next/server";
import { getLocalStats } from "@/lib/local-data";

export async function GET() {
  const summary = await getLocalStats();
  return NextResponse.json(summary);
}
