import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  return NextResponse.json(
    {
      error: "Local weekly mode is enabled. Cron generation is disabled. Refresh the weekly batch with Codex instead.",
    },
    { status: 409 }
  );
}
