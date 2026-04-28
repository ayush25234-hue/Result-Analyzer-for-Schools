import { NextResponse } from "next/server";
import { ResultStatus } from "@prisma/client";

import { requireAdminResponse } from "@/lib/auth-guard";
import { gradeFromPercentage } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { studentSchema } from "@/lib/schemas";

async function upsertSubjects(subjects: { name: string; marks: number }[]) {
  const normalized = await Promise.all(
    subjects.map(async (subject) => {
      const savedSubject = await prisma.subject.upsert({
        where: { name: subject.name },
        update: {},
        create: { name: subject.name }
      });

      return {
        ...subject,
        subjectId: savedSubject.id
      };
    })
  );

  return normalized;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const collegeId = url.searchParams.get("collegeId");
  const academicYearId = url.searchParams.get("academicYearId");
  const search = url.searchParams.get("search");
  const status = url.searchParams.get("status");

  const students = await prisma.student.findMany({
    where: {
      ...(collegeId ? { collegeId } : {}),
      ...(academicYearId ? { academicYearId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { rollNumber: { contains: search, mode: "insensitive" } }
            ]
          }
        : {}),
      ...(status
        ? {
            result: {
              status: status.toUpperCase() as ResultStatus
            }
          }
        : {})
    },
    include: {
      result: {
        include: {
          subjectMarks: {
            include: {
              subject: true
            }
          }
        }
      },
      academicYear: true,
      college: true
    },
    orderBy: { name: "asc" }
  });

  return NextResponse.json(students);
}

export async function POST(request: Request) {
  const unauthorized = requireAdminResponse();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const payload = studentSchema.parse(body);
  const subjectRows = await upsertSubjects(payload.subjects);
  const total = subjectRows.reduce((sum, subject) => sum + subject.marks, 0);
  const percentage = Number(((total / (subjectRows.length * 100)) * 100).toFixed(2));
  const status = subjectRows.some((subject) => subject.marks < 33) ? ResultStatus.FAIL : ResultStatus.PASS;

  const student = await prisma.student.create({
    data: {
      name: payload.name,
      rollNumber: payload.rollNumber,
      stream: payload.stream || null,
      districtCode: payload.districtCode || null,
      schoolCode: payload.schoolCode || null,
      collegeId: payload.collegeId,
      academicYearId: payload.academicYearId,
      result: {
        create: {
          total: Math.round(total),
          percentage,
          grade: gradeFromPercentage(percentage),
          status,
          strongSubject: subjectRows.slice().sort((a, b) => b.marks - a.marks)[0]?.name,
          weakSubject: subjectRows.slice().sort((a, b) => a.marks - b.marks)[0]?.name,
          subjectMarks: {
            create: subjectRows.map((subject) => ({
              subjectId: subject.subjectId,
              marks: subject.marks
            }))
          }
        }
      }
    },
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
    }
  });

  return NextResponse.json(student, { status: 201 });
}
