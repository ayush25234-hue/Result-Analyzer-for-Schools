"use client";

import { AlertTriangle, Award, LineChart, Trophy, Users } from "lucide-react";
import { useEffect, useState } from "react";

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

    </div>
  );
}
