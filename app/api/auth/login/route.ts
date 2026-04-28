import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
  getAdminCredentials
} from "@/lib/auth";

function safeEqual(a: string, b: string) {
  const first = Buffer.from(a);
  const second = Buffer.from(b);

  if (first.length !== second.length) {
    return false;
  }

  return timingSafeEqual(first, second);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const { username, password } = getAdminCredentials();

    if (!body.username || !body.password) {
      return NextResponse.json({ message: "Username and password are required." }, { status: 400 });
    }

    if (!safeEqual(body.username, username) || !safeEqual(body.password, password)) {
      return NextResponse.json({ message: "Invalid admin credentials." }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set(
      ADMIN_SESSION_COOKIE,
      createAdminSessionToken(username),
      adminSessionCookieOptions
    );
    return response;
  } catch (error) {
    console.error("POST /api/auth/login failed", error);
    const message =
      error instanceof Error ? error.message : "Unable to sign in.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
