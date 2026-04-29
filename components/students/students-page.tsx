"use client";

import { useEffect, useState } from "react";

import { SectionCard } from "@/components/dashboard/section-card";
import { useAuthSession } from "@/components/layout/auth-session-provider";
import { useActiveSession } from "@/components/layout/active-session-provider";
import { readJsonOrThrow } from "@/lib/client-fetch";
import { StudentForm } from "@/components/students/student-form";
import { StudentsTable } from "@/components/students/students-table";
import type { StudentRecord } from "@/types";

export function StudentsPage() {
  const { isAdmin } = useAuthSession();
  const { activeCollegeId, activeYearId, loading } = useActiveSession();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "rollNumber">("name");
  const [editing, setEditing] = useState<StudentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStudents = async () => {
    if (!activeCollegeId || !activeYearId) return;
    const query = new URLSearchParams({
      collegeId: activeCollegeId,
      academicYearId: activeYearId
    });

    if (search) query.set("search", search);
    if (statusFilter) query.set("status", statusFilter);
    query.set("sortBy", sortBy);

    try {
      setError(null);
      const response = await fetch(`/api/students?${query.toString()}`, { cache: "no-store" });
      const payload = await readJsonOrThrow<StudentRecord[]>(response);
      setStudents(payload);
    } catch (fetchError) {
      setStudents([]);
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load students.");
    }
  };

  useEffect(() => {
    void loadStudents();
  }, [activeCollegeId, activeYearId, statusFilter, sortBy]);

  if (loading) {
    return <div className="rounded-[2rem] bg-white/85 p-8 shadow-soft">Loading students...</div>;
  }

  if (!activeCollegeId) {
    return (
      <div className="rounded-[2rem] bg-white/85 p-8 shadow-soft">
        Create a college first from the Settings page to start adding students.
      </div>
    );
  }

  if (!activeYearId) {
    return (
      <div className="rounded-[2rem] bg-white/85 p-8 shadow-soft">
        Add an academic year for the selected college from the Settings page before using Students.
      </div>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      {isAdmin ? (
        <SectionCard title={editing ? "Edit Student" : "Manual Entry"} subtitle="Add or update student results with dynamic subjects">
          <StudentForm
            collegeId={activeCollegeId}
            academicYearId={activeYearId}
            initialValue={editing}
            onSaved={async () => {
              setEditing(null);
              await loadStudents();
            }}
            onCancel={() => setEditing(null)}
          />
        </SectionCard>
      ) : (
        <SectionCard title="Read-Only Access" subtitle="Public users can review student results but cannot edit them">
          <div className="rounded-2xl bg-mist p-6 text-sm text-slate-600">
            Sign in as admin to add, edit, delete, or import student records.
          </div>
        </SectionCard>
      )}

      <SectionCard title="Student Directory" subtitle="Search, filter, edit, and delete result entries">
        {error ? (
          <div className="mb-4 rounded-2xl border border-berry/20 bg-berry/5 p-4 text-sm text-berry">{error}</div>
        ) : null}
        <div className="mb-4 flex flex-col gap-3 md:flex-row">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by student name or roll number"
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-3"
          />
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value as "name" | "rollNumber")}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          >
            <option value="name">Sort by name</option>
            <option value="rollNumber">Sort by roll number</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-2xl border border-slate-200 px-4 py-3"
          >
            <option value="">All statuses</option>
            <option value="PASS">Pass</option>
            <option value="FAIL">Fail</option>
          </select>
          <button onClick={() => void loadStudents()} className="rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white">
            Apply
          </button>
        </div>

        <StudentsTable
          data={students}
          onEdit={setEditing}
          onDelete={async (student) => {
            await fetch(`/api/students/${student.id}`, { method: "DELETE" });
            await loadStudents();
          }}
          canManage={isAdmin}
        />
      </SectionCard>
    </div>
  );
}
