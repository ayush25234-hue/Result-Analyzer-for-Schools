"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { readJsonOrThrow } from "@/lib/client-fetch";
import type { AcademicYear, College } from "@/types";

type ActiveSessionContextValue = {
  colleges: College[];
  years: AcademicYear[];
  activeCollegeId: string;
  activeYearId: string;
  setActiveCollegeId: (value: string) => void;
  setActiveYearId: (value: string) => void;
  refreshContext: () => Promise<void>;
  loading: boolean;
  error: string | null;
};

const ActiveSessionContext = createContext<ActiveSessionContextValue | null>(null);

const COLLEGE_KEY = "up-board-active-college";
const YEAR_KEY = "up-board-active-year";

export function ActiveSessionProvider({ children }: { children: React.ReactNode }) {
  const [colleges, setColleges] = useState<College[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [activeCollegeId, setActiveCollegeIdState] = useState("");
  const [activeYearId, setActiveYearIdState] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshContext = async () => {
    try {
      setLoading(true);
      setError(null);
      const collegesResponse = await fetch("/api/colleges", { cache: "no-store" });
      const collegeItems = await readJsonOrThrow<College[]>(collegesResponse);
      setColleges(collegeItems);

      const storedCollegeId = window.localStorage.getItem(COLLEGE_KEY);
      const nextCollegeId = storedCollegeId && collegeItems.some((college) => college.id === storedCollegeId)
        ? storedCollegeId
        : collegeItems[0]?.id ?? "";
      setActiveCollegeIdState(nextCollegeId);

      if (nextCollegeId) {
        const yearsResponse = await fetch(`/api/years?collegeId=${nextCollegeId}`, { cache: "no-store" });
        const yearItems = await readJsonOrThrow<AcademicYear[]>(yearsResponse);
        setYears(yearItems);

        const storedYearId = window.localStorage.getItem(YEAR_KEY);
        const nextYearId = storedYearId && yearItems.some((year) => year.id === storedYearId)
          ? storedYearId
          : yearItems.at(-1)?.id ?? "";
        setActiveYearIdState(nextYearId);
      } else {
        setYears([]);
        setActiveYearIdState("");
      }
    } catch (fetchError) {
      setColleges([]);
      setYears([]);
      setActiveCollegeIdState("");
      setActiveYearIdState("");
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load colleges and academic years.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshContext();
  }, []);

  const setActiveCollegeId = async (value: string) => {
    window.localStorage.setItem(COLLEGE_KEY, value);
    setActiveCollegeIdState(value);
    try {
      setError(null);
      const yearsResponse = await fetch(`/api/years?collegeId=${value}`, { cache: "no-store" });
      const yearItems = await readJsonOrThrow<AcademicYear[]>(yearsResponse);
      setYears(yearItems);
      const nextYearId = yearItems.at(-1)?.id ?? "";
      setActiveYearIdState(nextYearId);
      if (nextYearId) {
        window.localStorage.setItem(YEAR_KEY, nextYearId);
      }
    } catch (fetchError) {
      setYears([]);
      setActiveYearIdState("");
      setError(fetchError instanceof Error ? fetchError.message : "Unable to switch academic year context.");
    }
  };

  const setActiveYearId = (value: string) => {
    window.localStorage.setItem(YEAR_KEY, value);
    setActiveYearIdState(value);
  };

  const value = useMemo(
    () => ({
      colleges,
      years,
      activeCollegeId,
      activeYearId,
      setActiveCollegeId,
      setActiveYearId,
      refreshContext,
      loading,
      error
    }),
    [colleges, years, activeCollegeId, activeYearId, loading, error]
  );

  return <ActiveSessionContext.Provider value={value}>{children}</ActiveSessionContext.Provider>;
}

export function useActiveSession() {
  const context = useContext(ActiveSessionContext);
  if (!context) {
    throw new Error("useActiveSession must be used within ActiveSessionProvider.");
  }

  return context;
}
