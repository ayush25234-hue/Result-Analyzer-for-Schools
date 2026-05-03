"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

import { SectionCard } from "@/components/dashboard/section-card";
import { useAuthSession } from "@/components/layout/auth-session-provider";
import { useActiveSession } from "@/components/layout/active-session-provider";
import { StudentForm } from "@/components/students/student-form";
import { StudentsTable } from "@/components/students/students-table";
import { readJsonOrThrow } from "@/lib/client-fetch";
import type { ImportPreview, StudentRecord } from "@/types";

export function UploadWorkbench() {
  const { isAdmin } = useAuthSession();
  const { activeCollegeId, activeYearId } = useActiveSession();
  const [batches, setBatches] = useState<Array<{ id: string; timestamp: string; totalRecords: number; source: string }>>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "rollNumber">("name");
  const [editing, setEditing] = useState<StudentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadBatches = async () => {
    if (!activeCollegeId || !activeYearId) {
      setBatches([]);
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/import?collegeId=${activeCollegeId}&academicYearId=${activeYearId}`, {
        cache: "no-store"
      });
      setBatches(
        await readJsonOrThrow<Array<{ id: string; timestamp: string; totalRecords: number; source: string }>>(response)
      );
    } catch (fetchError) {
      setBatches([]);
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load import batches.");
    }
  };

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
      setStudents(await readJsonOrThrow<StudentRecord[]>(response));
    } catch (fetchError) {
      setStudents([]);
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load students.");
    }
  };

  useEffect(() => {
    void loadBatches();
    void loadStudents();
  }, [activeCollegeId, activeYearId, statusFilter, sortBy]);

  const handleFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    try {
      setError(null);
      setSuccessMessage(null);

      const previewResponse = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commit: false,
          source: "excel",
          collegeId: activeCollegeId,
          academicYearId: activeYearId,
          rows
        })
      });

      const preview = await readJsonOrThrow<ImportPreview>(previewResponse);

      if (preview.errors.length > 0) {
        setError(preview.errors.map((item) => `Row ${item.row}: ${item.message}`).join(" "));
        return;
      }

      if (preview.duplicates.length > 0) {
        setError(`Duplicate roll numbers found: ${preview.duplicates.join(", ")}`);
        return;
      }

      const commitResponse = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commit: true,
          source: "excel",
          collegeId: activeCollegeId,
          academicYearId: activeYearId,
          rows
        })
      });

      if (!commitResponse.ok) {
        const data = await readJsonOrThrow<{ message?: string }>(commitResponse);
        setError(data.message ?? "Import failed.");
        return;
      }

      setSuccessMessage(`Import completed successfully for ${preview.parsedRows.length} students.`);
      await loadBatches();
      await loadStudents();
    } catch (fetchError) {
      setSuccessMessage(null);
      setError(fetchError instanceof Error ? fetchError.message : "Unable to import the file.");
    }
  };

  if (!activeCollegeId) {
    return (
      <div className="rounded-[2rem] bg-white/85 p-8 shadow-soft">
        Create a college first from the Settings page before importing result data.
      </div>
    );
  }

  if (!activeYearId) {
    return (
      <div className="rounded-[2rem] bg-white/85 p-8 shadow-soft">
        Add an academic year for the selected college from the Settings page before importing result data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        {error ? (
          <div className="xl:col-span-2 rounded-[1.5rem] border border-berry/20 bg-berry/5 p-4 text-sm text-berry">
            {error}
          </div>
        ) : null}
        {successMessage ? (
          <div className="xl:col-span-2 rounded-[1.5rem] border border-pine/20 bg-pine/5 p-4 text-sm text-pine">
            {successMessage}
          </div>
        ) : null}

        <SectionCard title="Data Intake" subtitle="Upload Excel or CSV to validate and save result data automatically">
          <label className="block rounded-[1.5rem] border border-dashed border-slate-300 bg-mist p-6 text-center">
            <span className="block text-sm text-slate-600">Choose an Excel or CSV file to import</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
              className="mt-4 w-full text-sm"
            />
          </label>
          <p className="mt-4 text-sm text-slate-600">
            The file is checked automatically. If validation passes, the batch is imported immediately.
          </p>
        </SectionCard>

        {isAdmin ? (
          <SectionCard title={editing ? "Edit Student" : "Manual Entry"} subtitle="Add or update student results with dynamic subjects">
            <StudentForm
              collegeId={activeCollegeId}
              academicYearId={activeYearId}
              initialValue={editing}
              onSaved={async () => {
                setEditing(null);
                setSuccessMessage("Student saved successfully.");
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

        <SectionCard title="Batch Rollback" subtitle="Recent imports can be reversed safely for the active college-year">
          <div className="space-y-3">
            {batches.length === 0 ? (
              <div className="rounded-2xl bg-mist p-4 text-sm text-slate-600">No import batches yet.</div>
            ) : (
              batches.map((batch) => (
                <div key={batch.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-ink">{batch.source}</p>
                    <p className="text-sm text-slate-600">
                      {new Date(batch.timestamp).toLocaleString()} | {batch.totalRecords} records
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      await fetch(`/api/import?batchId=${batch.id}`, { method: "DELETE" });
                      setSuccessMessage("Import batch rolled back.");
                      await loadBatches();
                      await loadStudents();
                    }}
                    className="rounded-2xl bg-berry/10 px-4 py-3 text-sm font-semibold text-berry"
                  >
                    Roll Back Batch
                  </button>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard title="Student Directory" subtitle="Search, filter, edit, and delete result entries">
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
              setSuccessMessage("Student deleted successfully.");
              await loadStudents();
            }}
            canManage={isAdmin}
          />
        </SectionCard>
      </div>
    </div>
  );
}
