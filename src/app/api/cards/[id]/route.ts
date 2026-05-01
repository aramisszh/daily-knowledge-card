import { NextResponse } from "next/server";
import { getCardByIdFromDatabase } from "@/services/card-service";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getCardByIdFromDatabase(id);
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  return NextResponse.json(card);
}
