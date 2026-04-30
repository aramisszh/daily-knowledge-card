import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  return NextResponse.json(
    {
      error: "Local weekly mode is enabled. Regenerate images through Codex when preparing the next weekly batch.",
    },
    { status: 409 }
  );
}
