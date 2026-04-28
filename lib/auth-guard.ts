import { NextResponse } from "next/server";

import { hasAdminSession } from "@/lib/auth";

export function requireAdminResponse() {
  if (hasAdminSession()) {
    return null;
  }

  return NextResponse.json({ message: "Admin login required." }, { status: 401 });
}
