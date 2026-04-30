import { NextResponse } from "next/server";
import { listLocalCards } from "@/lib/local-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const query = searchParams.get("query");
  const status = searchParams.get("status");

  const cards = await listLocalCards({ category, query, status });
  return NextResponse.json({ cards });
}
