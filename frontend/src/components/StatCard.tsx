import { ReactNode } from "react";

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = "brand",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  accent?: "brand" | "green" | "orange" | "purple";
}) {
  const accents: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600",
    green: "bg-emerald-50 text-emerald-600",
    orange: "bg-orange-50 text-orange-600",
    purple: "bg-violet-50 text-violet-600",
  };

  // Vertical layout keeps these readable two-across on a phone.
  return (
    <div className="card p-4">
      {icon && (
        <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${accents[accent]}`}>{icon}</div>
      )}
      <p className="text-xl font-bold leading-tight text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
      {hint && <p className="mt-1 text-[11px] leading-snug text-slate-400">{hint}</p>}
    </div>
  );
}
