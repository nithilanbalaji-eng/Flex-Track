import { FormEvent, useEffect, useMemo, useState } from "react";
import { format, parseISO, subDays, startOfWeek, addDays, isSameDay } from "date-fns";
import { logsApi } from "../api/logs";
import { plansApi } from "../api/plans";
import { GymLog, GymLogSummary, LogRange, WorkoutPlan } from "../types";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { AdSlot } from "../components/AdSlot";
import { IconFlame, IconCalendarCheck, IconTrash, IconDumbbell } from "../components/icons";
import { extractErrorMessage } from "../api/client";

const RANGES: { value: LogRange; label: string; weeks: number }[] = [
  { value: "week", label: "1W", weeks: 1 },
  { value: "month", label: "1M", weeks: 5 },
  { value: "6months", label: "6M", weeks: 26 },
  { value: "year", label: "1Y", weeks: 53 },
];

export function GymLogPage() {
  const [logs, setLogs] = useState<GymLog[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [summary, setSummary] = useState<GymLogSummary | null>(null);
  const [range, setRange] = useState<LogRange>("6months");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [duration, setDuration] = useState<string>("60");
  const [calories, setCalories] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [planDayId, setPlanDayId] = useState<string>("");

  const load = async (r: LogRange = range) => {
    const [l, s] = await Promise.all([logsApi.list(r), logsApi.summary()]);
    setLogs(l);
    setSummary(s);
  };

  useEffect(() => {
    Promise.all([load(), plansApi.list().then(setPlans)])
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeRange = async (r: LogRange) => {
    setRange(r);
    try {
      await load(r);
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const loggedDays = useMemo(() => {
    const map = new Map<string, GymLog>();
    for (const l of logs) map.set(l.date.slice(0, 10), l);
    return map;
  }, [logs]);

  const weeksShown = RANGES.find((r) => r.value === range)?.weeks ?? 26;

  const weeks = useMemo(() => {
    const end = new Date();
    const start = startOfWeek(subDays(end, weeksShown * 7), { weekStartsOn: 0 });
    const result: Date[][] = [];
    let cursor = start;
    for (let w = 0; w < weeksShown + 1; w++) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(cursor);
        cursor = addDays(cursor, 1);
      }
      result.push(week);
    }
    return result;
  }, [weeksShown]);

  // Every day across every plan the user can see, for the "what did you do" picker.
  const dayOptions = useMemo(
    () =>
      plans.flatMap((p) =>
        p.days.map((d) => ({
          id: d.id!,
          label: `${p.name} — Day ${d.dayNumber}: ${d.title}`,
        }))
      ),
    [plans]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await logsApi.create({
        date: new Date(`${date}T12:00:00`).toISOString(),
        durationMinutes: duration ? Number(duration) : undefined,
        caloriesBurned: calories ? Number(calories) : undefined,
        notes: notes || undefined,
        planDayId: planDayId || undefined,
      });
      setNotes("");
      setCalories("");
      setPlanDayId("");
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await logsApi.remove(id);
    await load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const today = new Date();
  // A single week is easier to read as a row of labelled days than as a grid.
  const singleWeek = range === "week";

  return (
    <div>
      <PageHeader title="Gym Log" description="Check in every time you train. Consistency is the whole game." />

      <ErrorBanner message={error} />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard
          label="Current streak"
          value={`${summary?.currentStreak ?? 0} ${summary?.currentStreak === 1 ? "day" : "days"}`}
          icon={<IconFlame className="h-5 w-5" />}
          accent="orange"
        />
        <StatCard
          label="Longest streak"
          value={`${summary?.longestStreak ?? 0} ${summary?.longestStreak === 1 ? "day" : "days"}`}
          icon={<IconFlame className="h-5 w-5" />}
          accent="purple"
        />
        <StatCard
          label="Last 30 days"
          value={`${summary?.sessionsLast30Days ?? 0} ${summary?.sessionsLast30Days === 1 ? "session" : "sessions"}`}
          icon={<IconCalendarCheck className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          label="All time"
          value={`${summary?.totalSessions ?? 0} ${summary?.totalSessions === 1 ? "session" : "sessions"}`}
          icon={<IconCalendarCheck className="h-5 w-5" />}
        />
      </div>

      <div className="card mb-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">History</h2>
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => changeRange(r.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  range === r.value ? "bg-white text-brand-600 shadow-sm" : "text-slate-500"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {singleWeek ? (
          <div className="grid grid-cols-7 gap-1.5">
            {weeks[weeks.length - 1].map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const log = loggedDays.get(key);
              const future = day > today;
              return (
                <div key={key} className="text-center">
                  <p className="mb-1 text-[10px] font-medium uppercase text-slate-400">{format(day, "EEEEE")}</p>
                  <div
                    className={`flex h-11 items-center justify-center rounded-lg text-sm font-semibold ${
                      future
                        ? "bg-slate-50 text-slate-300"
                        : log
                          ? "bg-brand-600 text-white"
                          : isSameDay(day, today)
                            ? "bg-slate-100 text-slate-500 ring-2 ring-brand-400"
                            : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {format(day, "d")}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto pb-2">
            <div className="flex gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day) => {
                    const key = format(day, "yyyy-MM-dd");
                    const log = loggedDays.get(key);
                    const future = day > today;
                    return (
                      <div
                        key={key}
                        title={`${format(day, "MMM d, yyyy")}${
                          log ? (log.planDay ? ` — Day ${log.planDay.dayNumber}: ${log.planDay.title}` : " — trained") : ""
                        }`}
                        className={`h-3 w-3 rounded-sm ${
                          future
                            ? "bg-transparent"
                            : log
                              ? "bg-brand-500"
                              : isSameDay(day, today)
                                ? "bg-slate-300 ring-1 ring-brand-400"
                                : "bg-slate-100"
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <span>Rest</span>
          <div className="h-3 w-3 rounded-sm bg-slate-100" />
          <div className="h-3 w-3 rounded-sm bg-brand-500" />
          <span>Trained</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card mb-6">
        <h2 className="font-semibold text-slate-900">Log a session</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="logDate">
              Date
            </label>
            <input id="logDate" type="date" required className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div>
            <label className="label" htmlFor="logPlanDay">
              What did you train?
            </label>
            {dayOptions.length === 0 ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-400">
                No workout plans yet — create one and you'll be able to tag each session.
              </p>
            ) : (
              <select
                id="logPlanDay"
                className="input"
                value={planDayId}
                onChange={(e) => setPlanDayId(e.target.value)}
              >
                <option value="">Not following a plan</option>
                {dayOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="logDuration">
                Duration (min)
              </label>
              <input id="logDuration" type="number" min={1} className="input" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="logCalories">
                Calories burned
              </label>
              <input
                id="logCalories"
                type="number"
                min={0}
                className="input"
                placeholder="optional"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="logNotes">
              Notes
            </label>
            <textarea
              id="logNotes"
              className="input min-h-[70px]"
              placeholder="Hit a PR on bench today 💪"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? "Saving…" : "Check in"}
          </button>
        </div>
      </form>

      <AdSlot placement="gym-log" />

      <div>
        <h2 className="mb-3 font-semibold text-slate-900">Recent sessions</h2>
        <div className="card p-0">
          {logs.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-slate-400">
              Nothing logged in this range. Check in above!
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {logs.map((log) => (
                <li key={log.id} className="flex items-start justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{format(parseISO(log.date), "EEEE, d MMMM yyyy")}</p>

                    {log.planDay && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-brand-700">
                        <IconDumbbell className="h-3.5 w-3.5" />
                        Day {log.planDay.dayNumber}: {log.planDay.title}
                        {log.plan && <span className="font-normal text-slate-400">· {log.plan.name}</span>}
                      </p>
                    )}

                    <p className="mt-0.5 text-xs text-slate-400">
                      {log.durationMinutes ? `${log.durationMinutes} min` : "Session"}
                      {log.caloriesBurned != null && ` · ${Math.round(log.caloriesBurned)} kcal`}
                      {log.source === "apple_health" && " · Apple Health"}
                    </p>

                    {log.notes && <p className="mt-1.5 text-sm text-slate-600">{log.notes}</p>}
                  </div>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="shrink-0 rounded-md p-2 text-slate-300 active:bg-red-50 active:text-red-600"
                    aria-label="Delete log"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
