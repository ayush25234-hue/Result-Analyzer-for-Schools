"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { SectionCard } from "@/components/dashboard/section-card";
import { useActiveSession } from "@/components/layout/active-session-provider";
import { readJsonOrThrow } from "@/lib/client-fetch";
import { settingsSchema } from "@/lib/schemas";

type SettingsValues = {
  passWeight: number;
  averageWeight: number;
  topPerformerWeight: number;
  consistencyWeight: number;
  lowFailureWeight: number;
  improvementWeight: number;
  subjectNormalizationJson: Record<string, string>;
};

export function SettingsForm() {
  const { colleges, years, activeCollegeId, refreshContext } = useActiveSession();
  const [normalizationText, setNormalizationText] = useState("{}");
  const [editingCollegeId, setEditingCollegeId] = useState("");
  const [editingYearId, setEditingYearId] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      passWeight: 35,
      averageWeight: 25,
      topPerformerWeight: 15,
      consistencyWeight: 10,
      lowFailureWeight: 10,
      improvementWeight: 5,
      subjectNormalizationJson: {}
    }
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoadError(null);
        const response = await fetch("/api/settings", { cache: "no-store" });
        const payload = await readJsonOrThrow<SettingsValues>(response);
        form.reset(payload);
        setNormalizationText(JSON.stringify(payload.subjectNormalizationJson ?? {}, null, 2));
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load settings.");
      }
    };

    void load();
  }, []);

  const saveSettings = async (values: SettingsValues) => {
    let subjectNormalizationJson: Record<string, string>;

    try {
      subjectNormalizationJson = JSON.parse(normalizationText || "{}") as Record<string, string>;
    } catch {
      alert("Subject normalization must be valid JSON.");
      return;
    }

    const response = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        subjectNormalizationJson
      })
    });

    if (!response.ok) {
      const payload = await response.json();
      alert(payload.message ?? "Unable to save settings.");
      return;
    }

    alert("Settings updated.");
  };

  const createCollege = async (formData: FormData) => {
    await fetch("/api/colleges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        location: String(formData.get("location") ?? "")
      })
    });
    await refreshContext();
  };

  const handleCollegeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    if (editingCollegeId) {
      await updateCollege(formData);
    } else {
      await createCollege(formData);
    }
    formElement.reset();
  };

  const updateCollege = async (formData: FormData) => {
    await fetch(`/api/colleges/${editingCollegeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        location: String(formData.get("location") ?? "")
      })
    });
    setEditingCollegeId("");
    await refreshContext();
  };

  const createYear = async (formData: FormData) => {
    await fetch("/api/years", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: Number(formData.get("year")),
        collegeId: activeCollegeId
      })
    });
    await refreshContext();
  };

  const handleYearSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formData = new FormData(formElement);
    if (editingYearId) {
      await updateYear(formData);
    } else {
      await createYear(formData);
    }
    formElement.reset();
  };

  const updateYear = async (formData: FormData) => {
    await fetch(`/api/years/${editingYearId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: Number(formData.get("year")),
        collegeId: activeCollegeId
      })
    });
    setEditingYearId("");
    await refreshContext();
  };

  const selectedCollege = colleges.find((college) => college.id === activeCollegeId);
  const editingCollege = colleges.find((college) => college.id === editingCollegeId);
  const editingYear = years.find((year) => year.id === editingYearId);

  return (
    <div className="space-y-6">
      {loadError ? (
        <div className="rounded-[1.5rem] border border-berry/20 bg-berry/5 p-4 text-sm text-berry">
          {loadError}
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Score Settings" subtitle="Configure the college performance score weightages">
          <form onSubmit={form.handleSubmit(saveSettings)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["passWeight", "Pass Percentage"],
                ["averageWeight", "Average Percentage"],
                ["topPerformerWeight", "Top Performer Index"],
                ["consistencyWeight", "Subject Consistency"],
                ["lowFailureWeight", "Low Failure Rate"],
                ["improvementWeight", "Yearly Improvement"]
              ].map(([name, label]) => (
                <label key={name} className="space-y-2 text-sm">
                  <span className="text-slate-600">{label}</span>
                  <input
                    type="number"
                    {...form.register(name as keyof SettingsValues, { valueAsNumber: true })}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3"
                  />
                </label>
              ))}
            </div>

            <label className="block space-y-2 text-sm">
              <span className="text-slate-600">Subject Normalization JSON</span>
              <textarea
                value={normalizationText}
                onChange={(event) => setNormalizationText(event.target.value)}
                rows={10}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 font-mono text-xs"
              />
            </label>

            <button type="submit" className="rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white">
              Save Settings
            </button>
          </form>
        </SectionCard>

        <SectionCard title="College Management" subtitle="Create, edit, or remove colleges">
          <div className="space-y-4">
            <form key={editingCollegeId || "new-college"} onSubmit={handleCollegeSubmit} className="grid gap-3 md:grid-cols-2">
              <input
                name="name"
                defaultValue={editingCollege?.name ?? ""}
                placeholder="College name"
                className="rounded-2xl border border-slate-200 px-4 py-3"
              />
              <input
                name="location"
                defaultValue={editingCollege?.location ?? ""}
                placeholder="Location"
                className="rounded-2xl border border-slate-200 px-4 py-3"
              />
              <button type="submit" className="rounded-2xl bg-pine px-4 py-3 text-sm font-semibold text-white">
                {editingCollegeId ? "Update College" : "Add College"}
              </button>
              {editingCollegeId ? (
                <button type="button" onClick={() => setEditingCollegeId("")} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                  Cancel
                </button>
              ) : null}
            </form>

            <div className="space-y-3">
              {colleges.map((college) => (
                <div key={college.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-semibold text-ink">{college.name}</p>
                    <p className="text-sm text-slate-600">{college.location}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditingCollegeId(college.id)} className="rounded-xl bg-mist px-3 py-2 text-xs font-semibold">
                      Edit
                    </button>
                    <button
                      onClick={async () => {
                        await fetch(`/api/colleges/${college.id}`, { method: "DELETE" });
                        await refreshContext();
                      }}
                      className="rounded-xl bg-berry/10 px-3 py-2 text-xs font-semibold text-berry"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Academic Year Management" subtitle={`Manage years for ${selectedCollege?.name ?? "the selected college"}`}>
        <div className="space-y-4">
          <form key={editingYearId || "new-year"} onSubmit={handleYearSubmit} className="flex flex-col gap-3 md:flex-row">
            <input
              name="year"
              type="number"
              defaultValue={editingYear?.year ?? ""}
              placeholder="Academic year"
              className="rounded-2xl border border-slate-200 px-4 py-3"
            />
            <button type="submit" className="rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-white">
              {editingYearId ? "Update Year" : "Add Year"}
            </button>
            {editingYearId ? (
              <button type="button" onClick={() => setEditingYearId("")} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                Cancel
              </button>
            ) : null}
          </form>

          <div className="grid gap-3 md:grid-cols-3">
            {years.map((year) => (
              <div key={year.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="text-lg font-semibold text-ink">{year.year}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => setEditingYearId(year.id)} className="rounded-xl bg-mist px-3 py-2 text-xs font-semibold">
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      await fetch(`/api/years/${year.id}`, { method: "DELETE" });
                      await refreshContext();
                    }}
                    className="rounded-xl bg-berry/10 px-3 py-2 text-xs font-semibold text-berry"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
