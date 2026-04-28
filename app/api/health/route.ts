import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "up-board-multi-college-result-analyzer",
    timestamp: new Date().toISOString()
  });
}
