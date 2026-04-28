import { NextResponse } from "next/server";
import { ResultStatus } from "@prisma/client";

import { requireAdminResponse } from "@/lib/auth-guard";
import { parseRows, parseSmartPaste } from "@/lib/import";
import { prisma } from "@/lib/prisma";
import { importCommitSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const unauthorized = requireAdminResponse();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();
    const settings = await prisma.appSettings.findUnique({ where: { id: "default" } });
    const normalizationMap = (settings?.subjectNormalizationJson as Record<string, string> | null) ?? {};

    if (body.smartPasteText) {
      const preview = parseSmartPaste(String(body.smartPasteText), normalizationMap);
      return NextResponse.json(preview);
    }

    const payload = importCommitSchema.parse(body);
    const preview = parseRows(payload.rows, normalizationMap);
    const existingRollNumbers = await prisma.student.findMany({
      where: {
        collegeId: payload.collegeId,
        academicYearId: payload.academicYearId,
        rollNumber: {
          in: preview.parsedRows.map((row) => row.rollNumber)
        }
      },
      select: {
        rollNumber: true
      }
    });
    const duplicateSet = new Set([
      ...preview.duplicates,
      ...existingRollNumbers.map((item) => item.rollNumber)
    ]);
    preview.duplicates = [...duplicateSet];

    if (!payload.commit) {
      return NextResponse.json(preview);
    }

    if (preview.errors.length > 0 || preview.duplicates.length > 0) {
      return NextResponse.json(
        {
          message: "Fix validation errors and duplicate roll numbers before import.",
          preview
        },
        { status: 400 }
      );
    }

    const uniqueSubjectNames = [...new Set(preview.parsedRows.flatMap((row) => row.subjects.map((subject) => subject.name)))];

    await Promise.all(
      uniqueSubjectNames.map((name) =>
        prisma.subject.upsert({
          where: { name },
          update: {},
          create: { name }
        })
      )
    );

    const savedSubjects = await prisma.subject.findMany({
      where: {
        name: {
          in: uniqueSubjectNames
        }
      }
    });

    const subjectIdByName = new Map(savedSubjects.map((subject) => [subject.name, subject.id]));

    const batch = await prisma.$transaction(async (tx) => {
      const savedBatch = await tx.importBatch.create({
        data: {
          totalRecords: preview.parsedRows.length,
          errors: preview.errors,
          source: payload.source,
          collegeId: payload.collegeId,
          academicYearId: payload.academicYearId
        }
      });

      for (const row of preview.parsedRows) {
        const subjectMarksPayload = row.subjects.map((subject) => {
          const subjectId = subjectIdByName.get(subject.name);

          if (!subjectId) {
            throw new Error(`Subject "${subject.name}" could not be resolved for import.`);
          }

          return {
            subjectId,
            marks: subject.marks
          };
        });

        const student = await tx.student.create({
          data: {
            name: row.name,
            rollNumber: row.rollNumber,
            stream: row.stream,
            schoolCode: row.schoolCode,
            districtCode: row.districtCode,
            importBatchId: savedBatch.id,
            collegeId: payload.collegeId,
            academicYearId: payload.academicYearId
          }
        });

        await tx.result.create({
          data: {
            studentId: student.id,
            total: Math.round(row.total),
            percentage: Number(row.percentage.toFixed(2)),
            grade: row.grade,
            status: row.status === "PASS" ? ResultStatus.PASS : ResultStatus.FAIL,
            strongSubject: row.strongSubject,
            weakSubject: row.weakSubject,
            subjectMarks: {
              create: subjectMarksPayload
            }
          }
        });
      }

      const createdResults = await tx.result.findMany({
        where: {
          student: {
            collegeId: payload.collegeId,
            academicYearId: payload.academicYearId
          }
        },
        orderBy: { percentage: "desc" }
      });

      await Promise.all(
        createdResults.map((result, index) =>
          tx.result.update({
            where: { id: result.id },
            data: { rank: index + 1 }
          })
        )
      );

      return savedBatch;
    });

    return NextResponse.json({ preview, batch }, { status: 201 });
  } catch (error) {
    console.error("POST /api/import failed", error);
    const message =
      error instanceof Error
        ? error.message
        : "Import failed because the server could not save the batch.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const unauthorized = requireAdminResponse();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const collegeId = url.searchParams.get("collegeId");
    const academicYearId = url.searchParams.get("academicYearId");

    const batches = await prisma.importBatch.findMany({
      where: {
        ...(collegeId ? { collegeId } : {}),
        ...(academicYearId ? { academicYearId } : {})
      },
      orderBy: { timestamp: "desc" }
    });

    return NextResponse.json(batches);
  } catch (error) {
    console.error("GET /api/import failed", error);
    return NextResponse.json({ message: "Unable to load import batches." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const unauthorized = requireAdminResponse();
  if (unauthorized) return unauthorized;

  try {
    const url = new URL(request.url);
    const batchId = url.searchParams.get("batchId");

    if (!batchId) {
      return NextResponse.json({ message: "batchId is required." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.student.deleteMany({
        where: { importBatchId: batchId }
      });
      await tx.importBatch.delete({
        where: { id: batchId }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/import failed", error);
    const message =
      error instanceof Error ? error.message : "Unable to roll back this import batch.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
