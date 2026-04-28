import { NextResponse } from "next/server";

import { requireAdminResponse } from "@/lib/auth-guard";
import { ensureDefaultSettings } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { settingsSchema } from "@/lib/schemas";

export async function GET() {
  try {
    const settings = await ensureDefaultSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/settings failed", error);
    return NextResponse.json(
      { message: "Settings could not load because the database is not initialized yet." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const unauthorized = requireAdminResponse();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const payload = settingsSchema.parse(body);

    const totalWeight =
      payload.passWeight +
      payload.averageWeight +
      payload.topPerformerWeight +
      payload.consistencyWeight +
      payload.lowFailureWeight +
      payload.improvementWeight;

    if (totalWeight !== 100) {
      return NextResponse.json({ message: "All score weights must total 100." }, { status: 400 });
    }

    const settings = await prisma.appSettings.upsert({
      where: { id: "default" },
      update: payload,
      create: {
        id: "default",
        ...payload
      }
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("PUT /api/settings failed", error);
    return NextResponse.json(
      { message: "Unable to save settings. Please verify the database setup." },
      { status: 500 }
    );
  }
}
