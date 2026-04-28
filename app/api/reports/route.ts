import { NextResponse } from "next/server";

import { getDashboardData } from "@/lib/data";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const collegeId = url.searchParams.get("collegeId");
  const academicYearId = url.searchParams.get("academicYearId");
  const studentId = url.searchParams.get("studentId");

  if (studentId) {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        college: true,
        academicYear: true,
        result: {
          include: {
            subjectMarks: {
              include: {
                subject: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(student);
  }

  if (!collegeId || !academicYearId) {
    return NextResponse.json(
      { message: "collegeId and academicYearId are required for summary reports." },
      { status: 400 }
    );
  }

  const [dashboard, students] = await Promise.all([
    getDashboardData(collegeId, academicYearId),
    prisma.student.findMany({
      where: { collegeId, academicYearId },
      include: {
        result: {
          include: {
            subjectMarks: {
              include: {
                subject: true
              }
            }
          }
        }
      },
      orderBy: { name: "asc" }
    })
  ]);

  return NextResponse.json({
    dashboard,
    students
  });
}
