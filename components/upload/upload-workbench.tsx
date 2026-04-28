"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

import { SectionCard } from "@/components/dashboard/section-card";
import { useActiveSession } from "@/components/layout/active-session-provider";
import { readJsonOrThrow } from "@/lib/client-fetch";
import type { ImportPreview } from "@/types";

export function UploadWorkbench() {
  const { activeCollegeId, activeYearId } = useActiveSession();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [smartPasteText, setSmartPasteText] = useState("");
  const [mode, setMode] = useState<"excel" | "smart-paste">("excel");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [batches, setBatches] = useState<Array<{ id: string; timestamp: string; totalRecords: number; source: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const canSaveImport = !!preview && preview.errors.length === 0 && preview.duplicates.length === 0;

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
      setBatches(await readJsonOrThrow<Array<{ id: string; timestamp: string; totalRecords: number; source: string }>>(response));
    } catch (fetchError) {
      setBatches([]);
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load import batches.");
    }
  };

  useEffect(() => {
    void loadBatches();
  }, [activeCollegeId, activeYearId]);

  const handleFile = async (file: File) => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    setRows(parsed);
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commit: false,
        source: "excel",
        collegeId: activeCollegeId,
        academicYearId: activeYearId,
        rows: parsed
      })
    });
    try {
      setError(null);
      setPreview(await readJsonOrThrow<ImportPreview>(response));
    } catch (fetchError) {
      setPreview(null);
      setError(fetchError instanceof Error ? fetchError.message : "Unable to preview the import file.");
    }
  };

  const previewSmartPaste = async () => {
    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ smartPasteText })
    });
    try {
      setError(null);
      setPreview(await readJsonOrThrow<ImportPreview>(response));
      setMode("smart-paste");
    } catch (fetchError) {
      setPreview(null);
      setError(fetchError instanceof Error ? fetchError.message : "Unable to parse pasted result text.");
    }
  };

  const commitImport = async () => {
    if (!preview) return;

    const payload =
      mode === "excel"
        ? {
            commit: true,
            source: "excel",
            collegeId: activeCollegeId,
            academicYearId: activeYearId,
            rows
          }
        : {
            commit: true,
            source: "smart-paste",
            collegeId: activeCollegeId,
            academicYearId: activeYearId,
            rows: preview.parsedRows.map((row) => {
              const subjectMap = Object.fromEntries(row.subjects.map((subject) => [subject.name, subject.marks]));
              return {
                name: row.name,
                "roll number": row.rollNumber,
                total: row.total,
                percentage: row.percentage,
                status: row.status,
                stream: row.stream,
                "school code": row.schoolCode,
                "district code": row.districtCode,
                ...subjectMap
              };
            })
          };

    const response = await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      try {
        const data = await readJsonOrThrow<{ message?: string }>(response);
        alert(data.message ?? "Import failed.");
      } catch (fetchError) {
        alert(fetchError instanceof Error ? fetchError.message : "Import failed.");
      }
      return;
    }

    alert("Import completed successfully.");
    setPreview(null);
    setSmartPasteText("");
    setRows([]);
    await loadBatches();
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
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      {error ? (
        <div className="xl:col-span-2 rounded-[1.5rem] border border-berry/20 bg-berry/5 p-4 text-sm text-berry">
          {error}
        </div>
      ) : null}
      <SectionCard title="Data Intake" subtitle="Upload Excel or paste a copied result card for extraction">
        <div className="space-y-4">
          <label className="block rounded-[1.5rem] border border-dashed border-slate-300 bg-mist p-6 text-center">
            <span className="block text-sm text-slate-600">Upload Excel or CSV</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                setMode("excel");
              }}
              className="mt-4 w-full text-sm"
            />
          </label>

          <div className="rounded-[1.5rem] border border-slate-200 p-4">
            <p className="mb-3 text-sm font-semibold text-ink">Smart Paste Result Text</p>
            <textarea
              value={smartPasteText}
              onChange={(event) => setSmartPasteText(event.target.value)}
              rows={12}
              placeholder={"Name: Aditi Sharma\nRoll Number: 1200456\nEnglish: 81\nPhysics: 75\nChemistry: 78\nMathematics: 88\nTotal: 322\nResult: Pass"}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3"
            />
            <button onClick={() => void previewSmartPaste()} className="mt-3 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white">
              Extract Preview
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Preview & Validation" subtitle="Review detected columns, duplicates, and parsed results before saving">
        {!preview ? (
          <div className="rounded-2xl bg-mist p-6 text-sm text-slate-600">
            No import preview yet. Upload a file or use smart paste to see extracted students here.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-mist p-4">
                <p className="text-sm text-slate-500">Parsed Rows</p>
                <p className="mt-2 text-2xl font-semibold text-ink">{preview.parsedRows.length}</p>
              </div>
              <div className="rounded-2xl bg-berry/10 p-4">
                <p className="text-sm text-berry">Validation Errors</p>
                <p className="mt-2 text-2xl font-semibold text-berry">{preview.errors.length}</p>
              </div>
              <div className="rounded-2xl bg-ember/10 p-4">
                <p className="text-sm text-ember">Duplicates</p>
                <p className="mt-2 text-2xl font-semibold text-ember">{preview.duplicates.length}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 text-sm">
              <p className="font-semibold text-ink">Detected Columns</p>
              <p className="mt-2 text-slate-600">{preview.detectedColumns.join(", ") || "Not available"}</p>
              <p className="mt-2 text-xs text-slate-500">
                Supported student columns include variants like Name, Student Name, Roll No, Roll Number, Stream, School Code, and District Code.
              </p>
            </div>

            {preview.errors.length > 0 ? (
              <div className="rounded-2xl border border-berry/20 bg-berry/5 p-4 text-sm text-berry">
                {preview.errors.map((error) => (
                  <p key={`${error.row}-${error.message}`}>
                    Row {error.row}: {error.message}
                  </p>
                ))}
              </div>
            ) : null}

            {preview.duplicates.length > 0 ? (
              <div className="rounded-2xl border border-ember/20 bg-ember/5 p-4 text-sm text-ember">
                <p className="font-semibold">Duplicate roll numbers found</p>
                <p className="mt-2 break-words">{preview.duplicates.join(", ")}</p>
              </div>
            ) : null}

            <div className="max-h-[420px] overflow-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Roll</th>
                    <th className="px-4 py-3">Subjects</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.parsedRows.map((row) => (
                    <tr key={row.rollNumber} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3 font-medium text-ink">{row.name}</td>
                      <td className="px-4 py-3">{row.rollNumber}</td>
                      <td className="px-4 py-3">
                        {row.subjects.map((subject) => `${subject.name}: ${subject.marks}`).join(", ")}
                      </td>
                      <td className="px-4 py-3">{row.total}</td>
                      <td className="px-4 py-3">{row.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canSaveImport ? (
              <button
                onClick={() => void commitImport()}
                className="rounded-2xl bg-pine px-4 py-3 text-sm font-semibold text-white"
              >
                Save Import Batch
              </button>
            ) : (
              <p className="text-sm text-berry">
                Resolve all validation errors and duplicate roll numbers before saving this import batch.
              </p>
            )}
          </div>
        )}
      </SectionCard>

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
                    await loadBatches();
                    alert("Import batch rolled back.");
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
    </div>
  );
}
