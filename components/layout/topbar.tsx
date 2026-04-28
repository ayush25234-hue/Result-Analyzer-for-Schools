"use client";

import { RefreshCcw } from "lucide-react";

import { useActiveSession } from "@/components/layout/active-session-provider";

export function Topbar() {
  const {
    colleges,
    years,
    activeCollegeId,
    activeYearId,
    setActiveCollegeId,
    setActiveYearId,
    refreshContext,
    loading,
    error
  } = useActiveSession();

  return (
    <div className="flex flex-col gap-4 rounded-[2rem] border border-white/60 bg-white/75 p-5 shadow-soft backdrop-blur lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Analysis Workspace</p>
        <h2 className="mt-1 text-2xl font-semibold text-ink">College and Academic Year Context</h2>
        {error ? <p className="mt-2 text-sm text-berry">{error}</p> : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={activeCollegeId}
          onChange={(event) => void setActiveCollegeId(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0"
        >
          {colleges.map((college) => (
            <option key={college.id} value={college.id}>
              {college.name}
            </option>
          ))}
        </select>

        <select
          value={activeYearId}
          onChange={(event) => setActiveYearId(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none ring-0"
        >
          {years.map((year) => (
            <option key={year.id} value={year.id}>
              {year.year}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => void refreshContext()}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
    </div>
  );
}
