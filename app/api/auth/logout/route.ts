import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, adminSessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    ...adminSessionCookieOptions,
    maxAge: 0
  });
  return response;
}
