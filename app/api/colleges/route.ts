import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { collegeSchema } from "@/lib/schemas";

export async function GET() {
  try {
    const colleges = await prisma.college.findMany({
      include: {
        academicYears: {
          orderBy: { year: "asc" }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json(colleges);
  } catch (error) {
    console.error("GET /api/colleges failed", error);
    return NextResponse.json(
      { message: "Database is not ready yet. Run Prisma migration and seed, then refresh the app." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const payload = collegeSchema.parse(body);

    const college = await prisma.college.create({
      data: payload
    });

    return NextResponse.json(college, { status: 201 });
  } catch (error) {
    console.error("POST /api/colleges failed", error);
    return NextResponse.json(
      { message: "Unable to save college. Please verify the database setup and request data." },
      { status: 500 }
    );
  }
}
