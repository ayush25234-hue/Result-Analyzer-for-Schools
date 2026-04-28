import { NextResponse } from "next/server";
import { ResultStatus } from "@prisma/client";

import { requireAdminResponse } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { studentSchema } from "@/lib/schemas";
import { gradeFromPercentage } from "@/lib/utils";

type RouteContext = {
  params: { id: string };
};

async function upsertSubjects(subjects: { name: string; marks: number }[]) {
  return Promise.all(
    subjects.map(async (subject) => {
      const savedSubject = await prisma.subject.upsert({
        where: { name: subject.name },
        update: {},
        create: { name: subject.name }
      });

      return {
        subjectId: savedSubject.id,
        name: savedSubject.name,
        marks: subject.marks
      };
    })
  );
}

export async function PUT(request: Request, { params }: RouteContext) {
  const unauthorized = requireAdminResponse();
  if (unauthorized) return unauthorized;

  const body = await request.json();
  const payload = studentSchema.parse(body);
  const subjectRows = await upsertSubjects(payload.subjects);
  const total = subjectRows.reduce((sum, subject) => sum + subject.marks, 0);
  const percentage = Number(((total / (subjectRows.length * 100)) * 100).toFixed(2));
  const status = subjectRows.some((subject) => subject.marks < 33) ? ResultStatus.FAIL : ResultStatus.PASS;

  const student = await prisma.student.update({
    where: { id: params.id },
    data: {
      name: payload.name,
      rollNumber: payload.rollNumber,
      stream: payload.stream || null,
      districtCode: payload.districtCode || null,
      schoolCode: payload.schoolCode || null,
      collegeId: payload.collegeId,
      academicYearId: payload.academicYearId,
      result: {
        upsert: {
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
          },
          update: {
            total: Math.round(total),
            percentage,
            grade: gradeFromPercentage(percentage),
            status,
            strongSubject: subjectRows.slice().sort((a, b) => b.marks - a.marks)[0]?.name,
            weakSubject: subjectRows.slice().sort((a, b) => a.marks - b.marks)[0]?.name,
            subjectMarks: {
              deleteMany: {},
              create: subjectRows.map((subject) => ({
                subjectId: subject.subjectId,
                marks: subject.marks
              }))
            }
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

  return NextResponse.json(student);
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const unauthorized = requireAdminResponse();
  if (unauthorized) return unauthorized;

  await prisma.student.delete({
    where: { id: params.id }
  });

  return NextResponse.json({ success: true });
}
