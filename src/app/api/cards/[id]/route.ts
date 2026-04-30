import { NextResponse } from "next/server";
import { getLocalCardById } from "@/lib/local-data";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const card = await getLocalCardById(id);
  if (!card) return NextResponse.json({ error: "Card not found" }, { status: 404 });
  return NextResponse.json(card);
}
