import { ResultStatus } from "@prisma/client";

import { buildDashboard, computeCollegeScore } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";

export async function ensureDefaultSettings() {
  return prisma.appSettings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", subjectNormalizationJson: {} }
  });
}

export async function getDashboardData(collegeId: string, academicYearId: string) {
  const [records, colleges, years, settings] = await Promise.all([
    prisma.result.findMany({
      where: {
        student: {
          collegeId,
          academicYearId
        }
      },
      include: {
        student: true,
        subjectMarks: {
          include: {
            subject: true
          }
        }
      }
    }),
    prisma.college.findMany({
      include: {
        academicYears: true
      },
      orderBy: { createdAt: "asc" }
    }),
    prisma.academicYear.findMany({
      where: { collegeId },
      orderBy: { year: "asc" }
    }),
    ensureDefaultSettings()
  ]);

  const currentYear = years.find((year) => year.id === academicYearId);
  const previousYear = currentYear
    ? years.filter((year) => year.year < currentYear.year).sort((a, b) => b.year - a.year)[0]
    : null;

  const comparisonRecords = await prisma.result.findMany({
    where: previousYear
      ? {
          student: {
            collegeId,
            academicYearId: previousYear.id
          }
        }
      : {
          id: "__none__"
        },
    include: {
      student: true,
      subjectMarks: {
        include: {
          subject: true
        }
      }
    }
  });

  const dashboard = buildDashboard(records);

  const collegeScores = await Promise.all(
    colleges.map(async (college) => {
      const matchingYear = currentYear
        ? college.academicYears.find((item) => item.year === currentYear.year)
        : null;
      const selectedYearId = matchingYear?.id;
      const collegeYearRecords = selectedYearId
        ? await prisma.result.findMany({
            where: {
              student: {
                collegeId: college.id,
                academicYearId: selectedYearId
              }
            },
            include: {
              student: true,
              subjectMarks: {
                include: {
                  subject: true
                }
              }
            }
          })
        : [];

      const previousCollegeYear = matchingYear
        ? college.academicYears
            .filter((item) => item.year < matchingYear.year)
            .sort((a, b) => b.year - a.year)[0]
        : null;

      const previousRecords = previousCollegeYear
        ? await prisma.result.findMany({
            where: {
              student: {
                collegeId: college.id,
                academicYearId: previousCollegeYear.id
              }
            },
            include: {
              student: true,
              subjectMarks: {
                include: {
                  subject: true
                }
              }
            }
          })
        : [];

      const score = computeCollegeScore(collegeYearRecords, previousRecords, settings);
      const currentDashboard = buildDashboard(collegeYearRecords);

      return {
        collegeId: college.id,
        college: college.name,
        year: matchingYear?.year ?? null,
        ...score,
        averagePercentage: currentDashboard.summary.averagePercentage
      };
    })
  );

  const rankingByScore = [...collegeScores].sort((a, b) => b.score - a.score);
  const rankingByImprovement = [...collegeScores].sort((a, b) => b.metrics.improvement - a.metrics.improvement);

  const yearSeries = await Promise.all(
    years.map(async (year) => {
      const items = await prisma.result.findMany({
        where: {
          student: {
            collegeId,
            academicYearId: year.id
          }
        }
      });

      const averagePercentage =
        items.length > 0 ? items.reduce((sum, item) => sum + item.percentage, 0) / items.length : 0;
      const passPercentage =
        items.length > 0
          ? (items.filter((item) => item.status === ResultStatus.PASS).length / items.length) * 100
          : 0;

      return {
        year: year.year,
        averagePercentage,
        passPercentage
      };
    })
  );

  return {
    ...dashboard,
    years,
    colleges,
    selectedYear: currentYear,
    previousYear: previousYear?.year ?? null,
    comparison: {
      rankings: rankingByScore,
      bestCollege: rankingByScore[0] ?? null,
      mostImprovedCollege: rankingByImprovement[0] ?? null,
      trend: yearSeries
    },
    previousYearAverage: buildDashboard(comparisonRecords).summary.averagePercentage
  };
}
