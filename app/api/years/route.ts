import { NextResponse } from "next/server";

import { requireAdminResponse } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { academicYearSchema } from "@/lib/schemas";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const collegeId = url.searchParams.get("collegeId");

    const years = await prisma.academicYear.findMany({
      where: collegeId ? { collegeId } : undefined,
      orderBy: [{ year: "asc" }]
    });

    return NextResponse.json(years);
  } catch (error) {
    console.error("GET /api/years failed", error);
    return NextResponse.json(
      { message: "Academic years could not load because the database is not ready yet." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const unauthorized = requireAdminResponse();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const payload = academicYearSchema.parse(body);

    const year = await prisma.academicYear.create({
      data: payload
    });

    return NextResponse.json(year, { status: 201 });
  } catch (error) {
    console.error("POST /api/years failed", error);
    return NextResponse.json(
      { message: "Unable to save academic year. Please verify the database setup and request data." },
      { status: 500 }
    );
  }
}
