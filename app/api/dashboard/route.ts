import { NextResponse } from "next/server";

import { getDashboardData } from "@/lib/data";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const collegeId = url.searchParams.get("collegeId");
  const academicYearId = url.searchParams.get("academicYearId");

  if (!collegeId || !academicYearId) {
    return NextResponse.json(
      { message: "collegeId and academicYearId are required." },
      { status: 400 }
    );
  }

  const dashboard = await getDashboardData(collegeId, academicYearId);
  return NextResponse.json(dashboard);
}
