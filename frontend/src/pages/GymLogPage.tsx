import { FormEvent, useEffect, useMemo, useState } from "react";
import { format, parseISO, subDays, startOfWeek, addDays, isSameDay } from "date-fns";
import { logsApi } from "../api/logs";
import { GymLog, GymLogSummary } from "../types";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { IconFlame, IconCalendarCheck, IconTrash } from "../components/icons";
import { extractErrorMessage } from "../api/client";

const WEEKS_SHOWN = 26;

export function GymLogPage() {
  const [logs, setLogs] = useState<GymLog[]>([]);
  const [summary, setSummary] = useState<GymLogSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [duration, setDuration] = useState<string>("60");
  const [calories, setCalories] = useState<string>("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    const [l, s] = await Promise.all([logsApi.list(), logsApi.summary()]);
    setLogs(l);
    setSummary(s);
  };

  useEffect(() => {
    load()
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const loggedDays = useMemo(() => new Set(logs.map((l) => l.date.slice(0, 10))), [logs]);

  const weeks = useMemo(() => {
    const end = new Date();
    const start = startOfWeek(subDays(end, WEEKS_SHOWN * 7), { weekStartsOn: 0 });
    const result: Date[][] = [];
    let cursor = start;
    for (let w = 0; w < WEEKS_SHOWN + 1; w++) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        week.push(cursor);
        cursor = addDays(cursor, 1);
      }
      result.push(week);
    }
    return result;
  }, []);

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
      });
      setNotes("");
      setCalories("");
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

  return (
    <div>
      <PageHeader title="Gym Log" description="Check in every time you train. Consistency is the whole game." />

      <ErrorBanner message={error} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <h2 className="mb-4 font-semibold text-slate-900">Last 6 months</h2>
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const logged = loggedDays.has(key);
                  const future = day > today;
                  return (
                    <div
                      key={key}
                      title={`${format(day, "MMM d, yyyy")}${logged ? " — trained" : ""}`}
                      className={`h-3 w-3 rounded-sm ${
                        future
                          ? "bg-transparent"
                          : logged
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
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <span>Less</span>
          <div className="h-3 w-3 rounded-sm bg-slate-100" />
          <div className="h-3 w-3 rounded-sm bg-brand-500" />
          <span>Trained</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={handleSubmit} className="card h-fit">
          <h2 className="font-semibold text-slate-900">Log a session</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="logDate">
                Date
              </label>
              <input id="logDate" type="date" required className="input" value={date} onChange={(e) => setDate(e.target.value)} />
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

        <div className="lg:col-span-2">
          <h2 className="mb-3 font-semibold text-slate-900">History</h2>
          <div className="card p-0">
            {logs.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-slate-400">No sessions logged yet. Check in above!</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <li key={log.id} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{format(parseISO(log.date), "EEEE, MMMM d, yyyy")}</p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {log.durationMinutes ? `${log.durationMinutes} min` : "Session"}
                        {log.caloriesBurned != null && ` · ${Math.round(log.caloriesBurned)} kcal`}
                        {log.source === "apple_health" && " · Apple Health"}
                      </p>
                      {log.notes && <p className="mt-1.5 text-sm text-slate-600">{log.notes}</p>}
                    </div>
                    <button
                      onClick={() => handleDelete(log.id)}
                      className="shrink-0 rounded-md p-2 text-slate-300 hover:bg-red-50 hover:text-red-600"
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
    </div>
  );
}
