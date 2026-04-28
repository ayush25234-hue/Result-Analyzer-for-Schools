import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const colleges = await prisma.college.findMany({
      include: {
        academicYears: {
          include: {
            students: {
              include: {
                result: true
              }
            }
          },
          orderBy: { year: "asc" }
        }
      }
    });

    const payload = colleges.map((college) => ({
      id: college.id,
      name: college.name,
      location: college.location,
      years: college.academicYears.map((year) => {
        const results = year.students.flatMap((student) => (student.result ? [student.result] : []));
        const averagePercentage =
          results.length > 0 ? results.reduce((sum, result) => sum + result.percentage, 0) / results.length : 0;
        return {
          year: year.year,
          averagePercentage,
          studentCount: year.students.length
        };
      })
    }));

    return NextResponse.json(payload);
  } catch (error) {
    console.error("GET /api/analytics failed", error);
    return NextResponse.json({ message: "Unable to load analytics." }, { status: 500 });
  }
}
