"use client";

import { jsPDF } from "jspdf";
import { useEffect, useMemo, useState } from "react";
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
  const [activeSection, setActiveSection] = useState<"marks" | "percentage" | "subject">("marks");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "rollNumber" | "rank">("name");
  const [statusFilter, setStatusFilter] = useState<"all" | "PASS" | "FAIL">("all");
  const [threshold, setThreshold] = useState<93 | 80 | 75 | 60>(93);
  const [subjectThreshold, setSubjectThreshold] = useState<80 | 90 | 95>(80);
  const [selectedSubject, setSelectedSubject] = useState("");

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
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load student insights.");
      }
    };

    void load();
  }, [activeCollegeId, activeYearId]);

  const students = payload?.students ?? [];
  const studentPerformanceList = payload?.dashboard.studentPerformanceList ?? [];
  const subjectThresholdPerformanceList = payload?.dashboard.subjectThresholdPerformanceList ?? [];

  const subjectColumns = useMemo(() => buildSubjectMarkColumns(students), [students]);
  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matchingStudents = students.filter((student) => {
      const statusMatches =
        statusFilter === "all" ? true : (student.result?.status ?? "").toUpperCase() === statusFilter;

      if (!statusMatches) {
        return false;
      }

      if (!query) return true;

      return student.name.toLowerCase().includes(query) || student.rollNumber.toLowerCase().includes(query);
    });

    return [...matchingStudents].sort((first, second) => {
      if (sortBy === "rollNumber") {
        return first.rollNumber.localeCompare(second.rollNumber, undefined, { numeric: true });
      }

      if (sortBy === "rank") {
        const firstRank = first.result?.rank ?? Number.MAX_SAFE_INTEGER;
        const secondRank = second.result?.rank ?? Number.MAX_SAFE_INTEGER;
        if (firstRank !== secondRank) {
          return firstRank - secondRank;
        }
        return first.name.localeCompare(second.name);
      }

      return first.name.localeCompare(second.name);
    });
  }, [search, sortBy, statusFilter, students]);

  const thresholdMatches = useMemo(
    () => studentPerformanceList.filter((student) => student.percentage >= threshold),
    [studentPerformanceList, threshold]
  );

  const subjectOptions = useMemo(
    () => [...new Set(subjectThresholdPerformanceList.map((item) => item.subject))].sort(),
    [subjectThresholdPerformanceList]
  );

  const subjectThresholdMatches = useMemo(
    () =>
      subjectThresholdPerformanceList.filter(
        (student) => student.subject === selectedSubject && student.marks >= subjectThreshold
      ),
    [selectedSubject, subjectThreshold, subjectThresholdPerformanceList]
  );

  const pageTitle = "Student Insights";
  const pageDescription = "Search, sort, and filter students by percentage and subject-wise thresholds.";

  useEffect(() => {
    if (subjectOptions.length === 0) {
      if (selectedSubject) {
        setSelectedSubject("");
      }
      return;
    }

    if (!selectedSubject || !subjectOptions.includes(selectedSubject)) {
      setSelectedSubject(subjectOptions[0]);
    }
  }, [selectedSubject, subjectOptions]);

  const exportExcel = () => {
    if (!payload) return;
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
        Create a college first from the Settings page before opening {pageTitle.toLowerCase()}.
      </div>
    );
  }

  if (!activeYearId) {
    return (
      <div className="rounded-[2rem] bg-white/85 p-8 shadow-soft">
        Add an academic year for the selected college from the Settings page before opening {pageTitle.toLowerCase()}.
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="rounded-[2rem] bg-white/85 p-8 shadow-soft">
        {error ?? `Loading ${pageTitle.toLowerCase()}...`}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard title={pageTitle} subtitle={pageDescription}>
        <div className="grid gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() => setActiveSection("marks")}
            className={`rounded-2xl border p-4 text-left transition ${
              activeSection === "marks"
                ? "border-ink bg-ink text-white shadow-soft"
                : "border-slate-200 bg-mist text-ink"
            }`}
          >
            <p className={`text-sm ${activeSection === "marks" ? "text-white/80" : "text-slate-500"}`}>
              Option 1
            </p>
            <p className="mt-2 text-lg font-semibold">Detailed Subject Marks</p>
            <p className={`mt-2 text-sm ${activeSection === "marks" ? "text-white/80" : "text-slate-700"}`}>
              Search by name or roll number, then sort by roll number, name, or rank.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("percentage")}
            className={`rounded-2xl border p-4 text-left transition ${
              activeSection === "percentage"
                ? "border-pine bg-pine text-white shadow-soft"
                : "border-slate-200 bg-mist text-ink"
            }`}
          >
            <p className={`text-sm ${activeSection === "percentage" ? "text-white/80" : "text-slate-500"}`}>
              Option 2
            </p>
            <p className="mt-2 text-lg font-semibold">Percentage Filter List</p>
            <p className={`mt-2 text-sm ${activeSection === "percentage" ? "text-white/80" : "text-slate-700"}`}>
              Instantly open student lists for 60%, 75%, 80%, or 93% and above.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("subject")}
            className={`rounded-2xl border p-4 text-left transition ${
              activeSection === "subject"
                ? "border-ember bg-ember text-white shadow-soft"
                : "border-slate-200 bg-mist text-ink"
            }`}
          >
            <p className={`text-sm ${activeSection === "subject" ? "text-white/80" : "text-slate-500"}`}>
              Option 3
            </p>
            <p className="mt-2 text-lg font-semibold">Subject-Wise Threshold List</p>
            <p className={`mt-2 text-sm ${activeSection === "subject" ? "text-white/80" : "text-slate-700"}`}>
              Pick any subject and see who scored 80, 90, or 95 and above.
            </p>
          </button>
        </div>
      </SectionCard>

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

      {activeSection === "marks" ? (
      <SectionCard title="Detailed Subject Marks" subtitle="Subject-wise marks for every student in the selected college-year">
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student by Name or Roll No."
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-3"
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | "PASS" | "FAIL")}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          >
            <option value="all">All Students</option>
            <option value="PASS">Pass Students</option>
            <option value="FAIL">Fail Students</option>
          </select>
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "name" | "rollNumber" | "rank")}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          >
            <option value="name">Sort by Name</option>
            <option value="rollNumber">Sort by Roll No.</option>
            <option value="rank">Sort by Rank</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 pr-4">Student</th>
                <th className="pb-3 pr-4">Roll</th>
                <th className="pb-3 pr-4">Rank</th>
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
              {filteredStudents.map((student) => {
                const subjectMap = Object.fromEntries(
                  (student.result?.subjectMarks ?? []).map((item) => [item.subject.name, item.marks])
                );

                return (
                  <tr key={student.id} className="border-t border-slate-100">
                    <td className="py-3 pr-4 font-medium text-ink">{student.name}</td>
                    <td className="py-3 pr-4">{student.rollNumber}</td>
                    <td className="py-3 pr-4">{student.result?.rank ?? "-"}</td>
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
          {filteredStudents.length === 0 ? (
            <p className="pt-4 text-sm text-slate-500">No students matched your search and status filter.</p>
          ) : null}
        </div>
      </SectionCard>
      ) : null}

      {activeSection === "percentage" ? (
      <SectionCard title="Percentage Filter List" subtitle="See both the count and student list at or above a selected percentage">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <select
            value={threshold}
            onChange={(event) => setThreshold(Number(event.target.value) as 93 | 80 | 75 | 60)}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          >
            <option value={93}>93% or above</option>
            <option value={80}>80% or above</option>
            <option value={75}>75% or above</option>
            <option value={60}>60% or above</option>
          </select>
          <div className="rounded-2xl bg-mist px-4 py-3 text-sm text-slate-700">
            Matching students: <span className="font-semibold text-ink">{thresholdMatches.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3">Rank</th>
                <th className="pb-3">Student</th>
                <th className="pb-3">Roll</th>
                <th className="pb-3">Stream</th>
                <th className="pb-3">Grade</th>
                <th className="pb-3">%</th>
              </tr>
            </thead>
            <tbody>
              {thresholdMatches.map((student) => (
                <tr key={student.id} className="border-t border-slate-100">
                  <td className="py-3">{student.rank}</td>
                  <td className="py-3 font-medium text-ink">{student.name}</td>
                  <td className="py-3">{student.rollNumber}</td>
                  <td className="py-3">{student.stream ?? "General"}</td>
                  <td className="py-3">{student.grade}</td>
                  <td className="py-3">{formatPercentage(student.percentage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {thresholdMatches.length === 0 ? (
            <p className="pt-4 text-sm text-slate-500">No students found at or above the selected percentage.</p>
          ) : null}
        </div>
      </SectionCard>
      ) : null}

      {activeSection === "subject" ? (
      <SectionCard title="Subject-Wise Threshold List" subtitle="Pick a subject and see students scoring 80, 90, or 95 and above in that subject">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row">
            <select
              value={selectedSubject}
              onChange={(event) => setSelectedSubject(event.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            >
              {subjectOptions.map((subject) => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
            <select
              value={subjectThreshold}
              onChange={(event) => setSubjectThreshold(Number(event.target.value) as 80 | 90 | 95)}
              className="rounded-2xl border border-slate-200 px-4 py-3"
            >
              <option value={80}>80 or above</option>
              <option value={90}>90 or above</option>
              <option value={95}>95 or above</option>
            </select>
          </div>
          <div className="rounded-2xl bg-mist px-4 py-3 text-sm text-slate-700">
            Matching students: <span className="font-semibold text-ink">{subjectThresholdMatches.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3">Rank</th>
                <th className="pb-3">Student</th>
                <th className="pb-3">Roll</th>
                <th className="pb-3">Stream</th>
                <th className="pb-3">Subject</th>
                <th className="pb-3">Marks</th>
                <th className="pb-3">Overall %</th>
              </tr>
            </thead>
            <tbody>
              {subjectThresholdMatches.map((student) => (
                <tr key={student.id} className="border-t border-slate-100">
                  <td className="py-3">{student.rank}</td>
                  <td className="py-3 font-medium text-ink">{student.name}</td>
                  <td className="py-3">{student.rollNumber}</td>
                  <td className="py-3">{student.stream ?? "General"}</td>
                  <td className="py-3">{student.subject}</td>
                  <td className="py-3">{student.marks}</td>
                  <td className="py-3">{formatPercentage(student.overallPercentage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {subjectThresholdMatches.length === 0 ? (
            <p className="pt-4 text-sm text-slate-500">No students found at or above the selected marks threshold for this subject.</p>
          ) : null}
        </div>
      </SectionCard>
      ) : null}
    </div>
  );
}
