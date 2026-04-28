"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { SectionCard } from "@/components/dashboard/section-card";
import type { DashboardPayload } from "@/types";

const pieColors = ["#0f766e", "#f97316", "#be123c", "#0ea5e9"];

export function DashboardCharts({ data }: { data: DashboardPayload }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <SectionCard title="Subject Performance" subtitle="Average marks by subject">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.subjectWiseAverages}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="subject" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="average" fill="#0f766e" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Pass vs Fail" subtitle="Distribution for the selected year">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={[
                  { name: "Pass", value: Number(data.summary.passPercentage.toFixed(1)) },
                  { name: "Fail", value: Number(data.summary.failPercentage.toFixed(1)) }
                ]}
                dataKey="value"
                innerRadius={75}
                outerRadius={110}
                paddingAngle={4}
              >
                {[0, 1].map((entry) => (
                  <Cell key={entry} fill={pieColors[entry]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Performance Trend" subtitle="Average percentage and pass rate over time">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.comparison.trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="averagePercentage" stroke="#0f766e" strokeWidth={3} />
              <Line type="monotone" dataKey="passPercentage" stroke="#f97316" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="College Comparison" subtitle="Score out of 100 for the active year">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.comparison.rankings}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="college" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                {data.comparison.rankings.map((entry, index) => (
                  <Cell key={entry.collegeId} fill={pieColors[index % pieColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
