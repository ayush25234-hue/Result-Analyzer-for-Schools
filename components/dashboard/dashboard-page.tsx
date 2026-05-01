"use client";

import { AlertTriangle, Award, LineChart, Trophy, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DashboardCharts } from "@/components/charts/dashboard-charts";
import { SectionCard } from "@/components/dashboard/section-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { useActiveSession } from "@/components/layout/active-session-provider";
import { readJsonOrThrow } from "@/lib/client-fetch";
import { formatPercentage } from "@/lib/utils";
import type { DashboardPayload } from "@/types";

export function DashboardPage() {
  const { activeCollegeId, activeYearId, loading } = useActiveSession();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<93 | 80 | 75 | 60>(93);
  const [subjectThreshold, setSubjectThreshold] = useState<80 | 90 | 95>(80);
  const [selectedSubject, setSelectedSubject] = useState("");

  useEffect(() => {
    if (!activeCollegeId || !activeYearId) return;

    const load = async () => {
      try {
        setPending(true);
        setError(null);
        const response = await fetch(
          `/api/dashboard?collegeId=${activeCollegeId}&academicYearId=${activeYearId}`,
          { cache: "no-store" }
        );
        const payload = await readJsonOrThrow<DashboardPayload>(response);
        setData(payload);
      } catch (fetchError) {
        setData(null);
        setError(fetchError instanceof Error ? fetchError.message : "Unable to load dashboard analytics.");
      } finally {
        setPending(false);
      }
    };

    void load();
  }, [activeCollegeId, activeYearId]);

  const thresholdMatches = useMemo(
    () => data?.studentPerformanceList.filter((student) => student.percentage >= threshold) ?? [],
    [data, threshold]
  );

  const subjectOptions = useMemo(
    () => [...new Set(data?.subjectThresholdPerformanceList.map((item) => item.subject) ?? [])].sort(),
    [data]
  );

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

  const subjectThresholdMatches = useMemo(
    () =>
      (data?.subjectThresholdPerformanceList ?? []).filter(
        (student) => student.subject === selectedSubject && student.marks >= subjectThreshold
      ),
    [data, selectedSubject, subjectThreshold]
  );

  if (loading || pending || !data) {
    if (!activeCollegeId) {
      return (
        <div className="rounded-[2rem] bg-white/85 p-8 shadow-soft">
          Create a college first from the Settings page to view analytics.
        </div>
      );
    }

    if (!activeYearId) {
      return (
        <div className="rounded-[2rem] bg-white/85 p-8 shadow-soft">
          Add an academic year for the selected college from the Settings page to view analytics.
        </div>
      );
    }

    return (
      <div className="rounded-[2rem] bg-white/85 p-8 shadow-soft">
        {error ?? "Loading dashboard analytics..."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Students"
          value={String(data.summary.totalStudents)}
          hint="Registered student records in the active college-year."
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          label="Pass Rate"
          value={formatPercentage(data.summary.passPercentage)}
          hint={`Fail rate ${formatPercentage(data.summary.failPercentage)}`}
          icon={<Award className="h-5 w-5" />}
        />
        <StatCard
          label="Average"
          value={formatPercentage(data.summary.averagePercentage)}
          hint={`Highest ${formatPercentage(data.summary.highestPercentage)} / Lowest ${formatPercentage(data.summary.lowestPercentage)}`}
          icon={<LineChart className="h-5 w-5" />}
        />
        <StatCard
          label="Topper"
          value={data.summary.topper ? data.summary.topper.name : "N/A"}
          hint={data.summary.topper ? `${data.summary.topper.rollNumber} | ${formatPercentage(data.summary.topper.percentage)}` : "No student records yet."}
          icon={<Trophy className="h-5 w-5" />}
        />
      </div>

      <DashboardCharts data={data} />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <SectionCard title="Top 10 Students" subtitle="Ranked by percentage">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3">Rank</th>
                  <th className="pb-3">Student</th>
                  <th className="pb-3">Roll</th>
                  <th className="pb-3">Grade</th>
                  <th className="pb-3">%</th>
                </tr>
              </thead>
              <tbody>
                {data.top10Students.map((student) => (
                  <tr key={student.id} className="border-t border-slate-100">
                    <td className="py-3">{student.rank}</td>
                    <td className="py-3 font-medium text-ink">{student.name}</td>
                    <td className="py-3">{student.rollNumber}</td>
                    <td className="py-3">{student.grade}</td>
                    <td className="py-3">{formatPercentage(student.percentage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard title="Comparison Highlights" subtitle="Cross-college performance for the selected year">
          <div className="space-y-4">
            <div className="rounded-2xl bg-mist p-4">
              <p className="text-sm text-slate-500">Best College</p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {data.comparison.bestCollege?.college ?? "N/A"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Score {data.comparison.bestCollege?.score ?? 0} | Grade {data.comparison.bestCollege?.grade ?? "N/A"}
              </p>
            </div>

            <div className="rounded-2xl bg-mist p-4">
              <p className="text-sm text-slate-500">Most Improved</p>
              <p className="mt-1 text-xl font-semibold text-ink">
                {data.comparison.mostImprovedCollege?.college ?? "N/A"}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Improvement index {formatPercentage(data.comparison.mostImprovedCollege?.metrics.improvement ?? 0)}
              </p>
            </div>

            <div className="rounded-2xl bg-berry/10 p-4">
              <div className="flex items-center gap-2 text-berry">
                <AlertTriangle className="h-4 w-4" />
                <p className="font-medium">Weak Subject Trends</p>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {data.weakSubjectTrends.map((item) => (
                  <div key={item.subject} className="flex items-center justify-between">
                    <span>{item.subject}</span>
                    <span>{formatPercentage(item.average)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Percentage Filter List" subtitle="See both the count and student list above a selected percentage">
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
    </div>
  );
}
