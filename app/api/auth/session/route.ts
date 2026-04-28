import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = getAdminSession();
  return NextResponse.json({
    isAdmin: !!session,
    username: session?.username ?? null
  });
}
