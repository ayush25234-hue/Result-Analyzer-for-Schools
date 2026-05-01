"use client";

import { jsPDF } from "jspdf";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

import { SectionCard } from "@/components/dashboard/section-card";
import { useActiveSession } from "@/components/layout/active-session-provider";
import { readJsonOrThrow } from "@/lib/client-fetch";
import { formatPercentage } from "@/lib/utils";
import type { DashboardPayload, StudentRecord } from "@/types";

type ReportPayload = {
  dashboard: DashboardPayload;
  students: StudentRecord[];
};

function buildSubjectMarkColumns(students: StudentRecord[]) {
  return [...new Set(students.flatMap((student) => student.result?.subjectMarks.map((item) => item.subject.name) ?? []))];
}

export function ReportCenter() {
  const { activeCollegeId, activeYearId } = useActiveSession();
  const [payload, setPayload] = useState<ReportPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCollegeId || !activeYearId) return;
    const load = async () => {
      try {
        setError(null);
        const response = await fetch(`/api/reports?collegeId=${activeCollegeId}&academicYearId=${activeYearId}`, {
          cache: "no-store"
        });
        setPayload(await readJsonOrThrow<ReportPayload>(response));
      } catch (fetchError) {
        setPayload(null);
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load reports.");
      }
    };

    void load();
  }, [activeCollegeId, activeYearId]);

  const exportExcel = () => {
    if (!payload) return;
    const subjectColumns = buildSubjectMarkColumns(payload.students);
    const rows = payload.students.map((student) => {
      const subjectMap = Object.fromEntries(
        (student.result?.subjectMarks ?? []).map((item) => [item.subject.name, item.marks])
      );

      return {
        Name: student.name,
        RollNumber: student.rollNumber,
        Stream: student.stream ?? "",
        ...Object.fromEntries(subjectColumns.map((subject) => [subject, subjectMap[subject] ?? ""])),
        Grade: student.result?.grade ?? "",
        Status: student.result?.status ?? "",
        Percentage: student.result?.percentage ?? 0,
        Total: student.result?.total ?? 0
      };
    });
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, "Results");
    XLSX.writeFile(workbook, "college-year-summary.xlsx");
  };

  const exportCsv = () => {
    if (!payload) return;
    const subjectColumns = buildSubjectMarkColumns(payload.students);
    const rows = payload.students.map((student) => {
      const subjectMap = Object.fromEntries(
        (student.result?.subjectMarks ?? []).map((item) => [item.subject.name, item.marks])
      );

      return {
        Name: student.name,
        RollNumber: student.rollNumber,
        ...Object.fromEntries(subjectColumns.map((subject) => [subject, subjectMap[subject] ?? ""])),
        Grade: student.result?.grade ?? "",
        Status: student.result?.status ?? "",
        Percentage: student.result?.percentage ?? 0
      };
    });
    const sheet = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(sheet);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "college-year-summary.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!payload) return;
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text("UP Board College-Year Summary Report", 14, 18);
    pdf.setFontSize(11);
    pdf.text(`Students: ${payload.dashboard.summary.totalStudents}`, 14, 30);
    pdf.text(`Pass Rate: ${formatPercentage(payload.dashboard.summary.passPercentage)}`, 14, 38);
    pdf.text(`Average Percentage: ${formatPercentage(payload.dashboard.summary.averagePercentage)}`, 14, 46);
    pdf.text(`Topper: ${payload.dashboard.summary.topper?.name ?? "N/A"}`, 14, 54);
    let y = 68;
    payload.dashboard.top10Students.slice(0, 8).forEach((student) => {
      pdf.text(`${student.rank}. ${student.name} - ${formatPercentage(student.percentage)}`, 14, y);
      y += 8;
    });
    pdf.save("college-year-summary.pdf");
  };

  if (!activeCollegeId) {
    return (
      <div className="rounded-[2rem] bg-white/85 p-8 shadow-soft">
        Create a college first from the Settings page before opening reports.
      </div>
    );
  }

  if (!activeYearId) {
    return (
      <div className="rounded-[2rem] bg-white/85 p-8 shadow-soft">
        Add an academic year for the selected college from the Settings page before opening reports.
      </div>
    );
  }

  if (!payload) {
    return <div className="rounded-[2rem] bg-white/85 p-8 shadow-soft">{error ?? "Loading reports..."}</div>;
  }

  const subjectColumns = buildSubjectMarkColumns(payload.students);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <button onClick={exportExcel} className="rounded-[1.75rem] bg-ink px-4 py-4 text-sm font-semibold text-white">
          Export Excel
        </button>
        <button onClick={exportCsv} className="rounded-[1.75rem] bg-pine px-4 py-4 text-sm font-semibold text-white">
          Export CSV
        </button>
        <button onClick={exportPdf} className="rounded-[1.75rem] bg-ember px-4 py-4 text-sm font-semibold text-white">
          Download PDF
        </button>
        <button onClick={() => window.print()} className="rounded-[1.75rem] bg-white px-4 py-4 text-sm font-semibold text-ink shadow-soft">
          Printable Dashboard
        </button>
      </div>

      <SectionCard title="Detailed Subject Marks" subtitle="Subject-wise marks for every student in the selected college-year">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 pr-4">Student</th>
                <th className="pb-3 pr-4">Roll</th>
                {subjectColumns.map((subject) => (
                  <th key={subject} className="pb-3 pr-4">
                    {subject}
                  </th>
                ))}
                <th className="pb-3 pr-4">Total</th>
                <th className="pb-3 pr-4">%</th>
                <th className="pb-3 pr-4">Grade</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {payload.students.map((student) => {
                const subjectMap = Object.fromEntries(
                  (student.result?.subjectMarks ?? []).map((item) => [item.subject.name, item.marks])
                );

                return (
                  <tr key={student.id} className="border-t border-slate-100">
                    <td className="py-3 pr-4 font-medium text-ink">{student.name}</td>
                    <td className="py-3 pr-4">{student.rollNumber}</td>
                    {subjectColumns.map((subject) => (
                      <td key={subject} className="py-3 pr-4">
                        {subjectMap[subject] ?? "-"}
                      </td>
                    ))}
                    <td className="py-3 pr-4">{student.result?.total ?? "-"}</td>
                    <td className="py-3 pr-4">{student.result ? formatPercentage(student.result.percentage) : "-"}</td>
                    <td className="py-3 pr-4">{student.result?.grade ?? "-"}</td>
                    <td className="py-3">{student.result?.status ?? "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
