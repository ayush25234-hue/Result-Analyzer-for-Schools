import { Prisma, ResultStatus } from "@prisma/client";

import { scoreGradeBands } from "@/lib/constants";

type DashboardRecord = Prisma.ResultGetPayload<{
  include: {
    student: true;
    subjectMarks: {
      include: {
        subject: true;
      };
    };
  };
}>;

type WeightConfig = {
  passWeight: number;
  averageWeight: number;
  topPerformerWeight: number;
  consistencyWeight: number;
  lowFailureWeight: number;
  improvementWeight: number;
};

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values: number[]) {
  if (values.length < 2) return 0;
  const mean = average(values);
  return average(values.map((value) => (value - mean) ** 2));
}

export function assignRanks(records: DashboardRecord[]) {
  return [...records]
    .sort((a, b) => b.percentage - a.percentage)
    .map((record, index) => ({
      ...record,
      computedRank: index + 1
    }));
}

export function buildDashboard(records: DashboardRecord[]) {
  const ranked = assignRanks(records);
  const totalStudents = ranked.length;
  const passCount = ranked.filter((record) => record.status === ResultStatus.PASS).length;
  const failCount = totalStudents - passCount;
  const passPercentage = totalStudents ? (passCount / totalStudents) * 100 : 0;
  const failPercentage = totalStudents ? (failCount / totalStudents) * 100 : 0;
  const averagePercentage = average(ranked.map((record) => record.percentage));
  const highestPercentage = Math.max(...ranked.map((record) => record.percentage), 0);
  const lowestPercentage = totalStudents ? Math.min(...ranked.map((record) => record.percentage)) : 0;
  const topper = ranked[0]
    ? {
        name: ranked[0].student.name,
        percentage: ranked[0].percentage,
        rollNumber: ranked[0].student.rollNumber
      }
    : null;

  const subjectGroups = new Map<string, number[]>();
  ranked.forEach((record) => {
    record.subjectMarks.forEach((subjectMark) => {
      const list = subjectGroups.get(subjectMark.subject.name) ?? [];
      list.push(subjectMark.marks);
      subjectGroups.set(subjectMark.subject.name, list);
    });
  });

  const subjectWiseAverages = [...subjectGroups.entries()]
    .map(([subject, marks]) => ({
      subject,
      average: average(marks),
      variance: variance(marks)
    }))
    .sort((a, b) => b.average - a.average);

  const top10Students = ranked.slice(0, 10).map((record) => ({
    id: record.studentId,
    name: record.student.name,
    percentage: record.percentage,
    grade: record.grade,
    rollNumber: record.student.rollNumber,
    stream: record.student.stream,
    rank: record.computedRank
  }));

  const failureList = ranked
    .filter((record) => record.status === ResultStatus.FAIL)
    .map((record) => ({
      id: record.studentId,
      name: record.student.name,
      rollNumber: record.student.rollNumber,
      percentage: record.percentage,
      weakSubject: record.weakSubject
    }));

  const streamGroups = new Map<string, number[]>();
  ranked.forEach((record) => {
    const key = record.student.stream || "General";
    const list = streamGroups.get(key) ?? [];
    list.push(record.percentage);
    streamGroups.set(key, list);
  });

  const scoreBands = {
    above93: ranked.filter((record) => record.percentage > 93).length,
    above80: ranked.filter((record) => record.percentage > 80).length,
    above75: ranked.filter((record) => record.percentage > 75).length,
    above60: ranked.filter((record) => record.percentage > 60).length
  };

  return {
    summary: {
      totalStudents,
      passPercentage,
      failPercentage,
      averagePercentage,
      highestPercentage,
      lowestPercentage,
      topper
    },
    scoreBands,
    top10Students,
    failureList,
    subjectWiseAverages,
    weakSubjectTrends: subjectWiseAverages
      .slice()
      .sort((a, b) => a.average - b.average)
      .slice(0, 5),
    streamWiseAnalysis: [...streamGroups.entries()].map(([stream, values]) => ({
      stream,
      averagePercentage: average(values),
      strength: values.length
    }))
  };
}

export function computeCollegeScore(
  currentYearRecords: DashboardRecord[],
  previousYearRecords: DashboardRecord[],
  weights: WeightConfig
) {
  const current = buildDashboard(currentYearRecords);
  const previous = buildDashboard(previousYearRecords);
  const topPerformerIndex =
    current.summary.totalStudents > 0
      ? (currentYearRecords.filter((record) => record.percentage >= 75).length / current.summary.totalStudents) * 100
      : 0;
  const subjectConsistency =
    current.subjectWiseAverages.length > 0
      ? Math.max(
          0,
          100 - average(current.subjectWiseAverages.map((subject) => Math.min(subject.variance, 100)))
        )
      : 0;
  const lowFailureRate = 100 - current.summary.failPercentage;
  const improvement =
    previous.summary.totalStudents > 0
      ? Math.max(0, Math.min(100, 50 + (current.summary.averagePercentage - previous.summary.averagePercentage)))
      : 50;

  const score =
    (current.summary.passPercentage * weights.passWeight) / 100 +
    (current.summary.averagePercentage * weights.averageWeight) / 100 +
    (topPerformerIndex * weights.topPerformerWeight) / 100 +
    (subjectConsistency * weights.consistencyWeight) / 100 +
    (lowFailureRate * weights.lowFailureWeight) / 100 +
    (improvement * weights.improvementWeight) / 100;

  const grade = scoreGradeBands.find((band) => score >= band.min)?.grade ?? "Needs Improvement";

  return {
    score: Number(score.toFixed(2)),
    grade,
    metrics: {
      passPercentage: current.summary.passPercentage,
      averagePercentage: current.summary.averagePercentage,
      topPerformerIndex,
      subjectConsistency,
      lowFailureRate,
      improvement
    }
  };
}
