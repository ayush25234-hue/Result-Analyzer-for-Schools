import { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string;
  hint: string;
  icon?: ReactNode;
};

export function StatCard({ label, value, hint, icon }: StatCardProps) {
  return (
    <div className="rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{value}</p>
        </div>
        {icon ? <div className="rounded-2xl bg-mist p-3 text-pine">{icon}</div> : null}
      </div>
      <p className="mt-4 text-sm text-slate-600">{hint}</p>
    </div>
  );
}
