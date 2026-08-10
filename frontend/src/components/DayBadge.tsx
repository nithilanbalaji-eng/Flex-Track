/** Labels a workout day as "Day 1" rather than a bare number. */
export function DayBadge({ dayNumber }: { dayNumber: number }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-white">
      Day {dayNumber}
    </span>
  );
}

/** Shows the planned session length, when the plan specifies one. */
export function DurationBadge({ minutes }: { minutes?: number | null }) {
  if (!minutes) return null;
  return (
    <span className="inline-flex shrink-0 items-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
      {minutes} min
    </span>
  );
}
