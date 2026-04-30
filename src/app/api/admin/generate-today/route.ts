import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  return NextResponse.json(
    {
      error: "Local weekly mode is enabled. Use Codex to generate a 7-day batch into data/cards.json instead of calling online generation.",
    },
    { status: 409 }
  );
}
