"use client";

import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { studentSchema } from "@/lib/schemas";
import type { StudentRecord } from "@/types";

type StudentFormValues = {
  id?: string;
  name: string;
  rollNumber: string;
  stream?: string;
  districtCode?: string;
  schoolCode?: string;
  collegeId: string;
  academicYearId: string;
  subjects: { name: string; marks: number }[];
};

export function StudentForm({
  collegeId,
  academicYearId,
  initialValue,
  onSaved,
  onCancel
}: {
  collegeId: string;
  academicYearId: string;
  initialValue?: StudentRecord | null;
  onSaved: () => Promise<void> | void;
  onCancel?: () => void;
}) {
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: initialValue
      ? {
          id: initialValue.id,
          name: initialValue.name,
          rollNumber: initialValue.rollNumber,
          stream: initialValue.stream ?? "",
          districtCode: initialValue.districtCode ?? "",
          schoolCode: initialValue.schoolCode ?? "",
          collegeId,
          academicYearId,
          subjects:
            initialValue.result?.subjectMarks.map((item) => ({
              name: item.subject.name,
              marks: item.marks
            })) ?? [{ name: "", marks: 0 }]
        }
      : {
          name: "",
          rollNumber: "",
          stream: "",
          districtCode: "",
          schoolCode: "",
          collegeId,
          academicYearId,
          subjects: [{ name: "", marks: 0 }]
        }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subjects"
  });

  useEffect(() => {
    form.reset(
      initialValue
        ? {
            id: initialValue.id,
            name: initialValue.name,
            rollNumber: initialValue.rollNumber,
            stream: initialValue.stream ?? "",
            districtCode: initialValue.districtCode ?? "",
            schoolCode: initialValue.schoolCode ?? "",
            collegeId,
            academicYearId,
            subjects:
              initialValue.result?.subjectMarks.map((item) => ({
                name: item.subject.name,
                marks: item.marks
              })) ?? [{ name: "", marks: 0 }]
          }
        : {
            name: "",
            rollNumber: "",
            stream: "",
            districtCode: "",
            schoolCode: "",
            collegeId,
            academicYearId,
            subjects: [{ name: "", marks: 0 }]
          }
    );
  }, [initialValue, collegeId, academicYearId, form]);

  const submit = async (values: StudentFormValues) => {
    const response = await fetch(initialValue ? `/api/students/${initialValue.id}` : "/api/students", {
      method: initialValue ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(values)
    });

    if (!response.ok) {
      const payload = await response.json();
      alert(payload.message ?? "Unable to save student.");
      return;
    }

    form.reset();
    await onSaved();
  };

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <input {...form.register("name")} placeholder="Student name" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input {...form.register("rollNumber")} placeholder="Roll number" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input {...form.register("stream")} placeholder="Stream" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input {...form.register("districtCode")} placeholder="District code" className="rounded-2xl border border-slate-200 px-4 py-3" />
        <input {...form.register("schoolCode")} placeholder="School code" className="rounded-2xl border border-slate-200 px-4 py-3 md:col-span-2" />
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => (
          <div key={field.id} className="grid gap-3 md:grid-cols-[1fr_160px_100px]">
            <input
              {...form.register(`subjects.${index}.name`)}
              placeholder="Subject name"
              className="rounded-2xl border border-slate-200 px-4 py-3"
            />
            <input
              type="number"
              {...form.register(`subjects.${index}.marks`, { valueAsNumber: true })}
              placeholder="Marks"
              className="rounded-2xl border border-slate-200 px-4 py-3"
            />
            <button
              type="button"
              onClick={() => remove(index)}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => append({ name: "", marks: 0 })}
        className="rounded-2xl bg-mist px-4 py-3 text-sm font-semibold text-ink"
      >
        Add Subject
      </button>

      <div className="flex gap-3">
        <button type="submit" className="rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white">
          {initialValue ? "Update Student" : "Save Student"}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}
