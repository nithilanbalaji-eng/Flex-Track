import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { logsApi } from "../api/logs";
import { plansApi } from "../api/plans";
import { caloriesApi, DaySummary } from "../api/calories";
import { GymLog, GymLogSummary, WorkoutPlan } from "../types";
import { StatCard } from "../components/StatCard";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { IconFlame, IconCalendarCheck, IconDumbbell, IconSparkles, IconPlus, IconChevronRight } from "../components/icons";

export function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<GymLogSummary | null>(null);
  const [logs, setLogs] = useState<GymLog[]>([]);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [today, setToday] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    Promise.all([logsApi.summary(), logsApi.list(), plansApi.list(), caloriesApi.getDay(todayStr)])
      .then(([s, l, p, c]) => {
        setSummary(s);
        setLogs(l.slice(0, 5));
        setPlans(p.slice(0, 4));
        setToday(c);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const calorieTarget = today?.target?.target ?? null;
  const caloriePct = calorieTarget ? Math.min(Math.round((today!.totals.calories / calorieTarget) * 100), 100) : 0;
  const needsProfile = !user?.age || !user?.weightKg || !user?.heightCm;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Welcome back, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">Here's how your training is going.</p>
      </div>

      {needsProfile && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-900">Finish setting up your profile</p>
            <p className="mt-0.5 text-sm text-brand-700">
              Add your age, height and weight so we can calculate calorie targets and personalize your plans.
            </p>
          </div>
          <Link to="/settings" className="btn-primary shrink-0">
            Complete profile
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Current streak"
          value={`${summary?.currentStreak ?? 0} ${summary?.currentStreak === 1 ? "day" : "days"}`}
          hint={`Longest: ${summary?.longestStreak ?? 0} ${summary?.longestStreak === 1 ? "day" : "days"}`}
          icon={<IconFlame className="h-5 w-5" />}
          accent="orange"
        />
        <StatCard
          label="Sessions (30 days)"
          value={summary?.sessionsLast30Days ?? 0}
          hint={`${summary?.totalSessions ?? 0} all time`}
          icon={<IconCalendarCheck className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          label="Calories today"
          value={Math.round(today?.totals.calories ?? 0)}
          hint={calorieTarget ? `${caloriePct}% of ${calorieTarget} target` : "Set your profile for a target"}
          icon={<IconFlame className="h-5 w-5" />}
        />
        <StatCard
          label="Calories burned"
          value={Math.round(summary?.totalCaloriesBurned ?? 0)}
          hint="Logged + Apple Health"
          icon={<IconDumbbell className="h-5 w-5" />}
          accent="purple"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Your workout plans</h2>
            <Link to="/plans" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View all
            </Link>
          </div>

          {plans.length === 0 ? (
            <EmptyState
              title="No workout plans yet"
              description="Build one from scratch, or let the AI coach design a plan around your goals."
              icon={<IconDumbbell className="h-8 w-8" />}
              action={
                <div className="flex flex-wrap justify-center gap-3">
                  <Link to="/coach" className="btn-primary">
                    <IconSparkles className="h-4 w-4" /> Generate with AI
                  </Link>
                  <Link to="/plans/new" className="btn-secondary">
                    <IconPlus className="h-4 w-4" /> Create manually
                  </Link>
                </div>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {plans.map((plan) => (
                <Link key={plan.id} to={`/plans/${plan.id}`} className="card transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">{plan.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {plan.daysPerWeek ?? plan.days.length} days/week · by {plan.createdBy.name}
                      </p>
                    </div>
                    <IconChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {plan.isAiGenerated && <span className="badge">AI generated</span>}
                    {plan.group && (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                        {plan.group.name}
                      </span>
                    )}
                    {plan.shares.length > 0 && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        Shared with {plan.shares.length}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent gym visits</h2>
            <Link to="/gym-log" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              Log one
            </Link>
          </div>
          <div className="card p-0">
            {logs.length === 0 ? (
              <p className="px-6 py-10 text-center text-sm text-slate-400">No sessions logged yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <li key={log.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{format(parseISO(log.date), "EEE, MMM d")}</p>
                      <p className="text-xs text-slate-400">
                        {log.durationMinutes ? `${log.durationMinutes} min` : "Session"}
                        {log.source === "apple_health" && " · Apple Health"}
                      </p>
                    </div>
                    {log.caloriesBurned != null && (
                      <span className="text-xs font-semibold text-orange-600">{Math.round(log.caloriesBurned)} kcal</span>
                    )}
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
