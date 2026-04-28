export function SectionCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/60 bg-white/85 p-5 shadow-soft">
      <div className="mb-5 flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        {subtitle ? <p className="text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}
