import { NextResponse } from "next/server";
import { listCardsFromDatabase } from "@/services/card-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const query = searchParams.get("query");
  const status = searchParams.get("status");

  const cards = await listCardsFromDatabase({ category, query, status });
  return NextResponse.json({ cards });
}
