import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, addDays, parseISO } from "date-fns";
import { caloriesApi, DaySummary } from "../api/calories";
import { CalorieEntry } from "../types";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { IconTrash, IconPlus } from "../components/icons";
import { extractErrorMessage } from "../api/client";

const MEALS: CalorieEntry["mealType"][] = ["breakfast", "lunch", "dinner", "snack"];

export function CalorieTracker() {
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [day, setDay] = useState<DaySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [foodName, setFoodName] = useState("");
  const [mealType, setMealType] = useState<CalorieEntry["mealType"]>("breakfast");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const load = (d: string) => caloriesApi.getDay(d).then(setDay);

  useEffect(() => {
    setLoading(true);
    load(date)
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [date]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await caloriesApi.create({
        date: new Date(`${date}T12:00:00`).toISOString(),
        mealType,
        foodName,
        calories: Number(calories),
        protein: protein ? Number(protein) : undefined,
        carbs: carbs ? Number(carbs) : undefined,
        fat: fat ? Number(fat) : undefined,
      });
      setFoodName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      await load(date);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await caloriesApi.remove(id);
    await load(date);
  };

  const target = day?.target ?? null;
  const consumed = day?.totals.calories ?? 0;
  const pct = target?.target ? Math.min((consumed / target.target) * 100, 100) : 0;
  const remaining = target?.target ? Math.round(target.target - consumed) : null;

  return (
    <div>
      <PageHeader
        title="Calorie Tracker"
        description="Log what you eat and stay on target for your goal."
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => setDate(format(addDays(parseISO(date), -1), "yyyy-MM-dd"))} className="btn-secondary px-3">
              ←
            </button>
            <input type="date" className="input w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
            <button onClick={() => setDate(format(addDays(parseISO(date), 1), "yyyy-MM-dd"))} className="btn-secondary px-3">
              →
            </button>
          </div>
        }
      />

      <ErrorBanner message={error} />

      {loading ? (
        <div className="flex justify-center py-24">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          {!target?.target && (
            <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-900">No calorie target yet</p>
                <p className="mt-0.5 text-sm text-amber-800">
                  Add your age, height and weight in Settings and we'll calculate your daily target and macros.
                </p>
              </div>
              <Link to="/settings" className="btn-primary shrink-0">
                Add my stats
              </Link>
            </div>
          )}

          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <div className="card lg:col-span-2">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500">Consumed today</p>
                  <p className="mt-1 text-3xl font-bold text-slate-900">
                    {Math.round(consumed)}
                    {target?.target && <span className="text-lg font-medium text-slate-400"> / {target.target} kcal</span>}
                  </p>
                </div>
                {remaining !== null && (
                  <p className={`text-sm font-semibold ${remaining >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {remaining >= 0 ? `${remaining} kcal left` : `${Math.abs(remaining)} kcal over`}
                  </p>
                )}
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    remaining !== null && remaining < 0 ? "bg-red-500" : "bg-brand-500"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="mt-6 grid grid-cols-3 gap-4">
                <MacroBar label="Protein" value={day?.totals.protein ?? 0} target={target?.proteinGrams ?? null} color="bg-emerald-500" />
                <MacroBar label="Carbs" value={day?.totals.carbs ?? 0} target={target?.carbsGrams ?? null} color="bg-amber-500" />
                <MacroBar label="Fat" value={day?.totals.fat ?? 0} target={target?.fatGrams ?? null} color="bg-violet-500" />
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold text-slate-900">Your targets</h2>
              {target?.target ? (
                <dl className="mt-4 space-y-2.5 text-sm">
                  <Row label="BMR" value={`${target.bmr} kcal`} />
                  <Row label="Maintenance (TDEE)" value={`${target.tdee} kcal`} />
                  <Row label="Daily target" value={`${target.target} kcal`} bold />
                  <Row label="Protein" value={`${target.proteinGrams} g`} />
                  <Row label="Carbs" value={`${target.carbsGrams} g`} />
                  <Row label="Fat" value={`${target.fatGrams} g`} />
                </dl>
              ) : (
                <p className="mt-3 text-sm text-slate-400">Complete your profile to see personalized targets.</p>
              )}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <form onSubmit={handleSubmit} className="card h-fit">
              <h2 className="font-semibold text-slate-900">Add food</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="label" htmlFor="foodName">
                    Food
                  </label>
                  <input id="foodName" required className="input" placeholder="Chicken & rice" value={foodName} onChange={(e) => setFoodName(e.target.value)} />
                </div>
                <div>
                  <label className="label" htmlFor="mealType">
                    Meal
                  </label>
                  <select id="mealType" className="input capitalize" value={mealType} onChange={(e) => setMealType(e.target.value as CalorieEntry["mealType"])}>
                    {MEALS.map((m) => (
                      <option key={m} value={m} className="capitalize">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="kcal">
                    Calories
                  </label>
                  <input id="kcal" type="number" min={0} required className="input" placeholder="620" value={calories} onChange={(e) => setCalories(e.target.value)} />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label text-xs">Protein (g)</label>
                    <input type="number" min={0} className="input" value={protein} onChange={(e) => setProtein(e.target.value)} />
                  </div>
                  <div>
                    <label className="label text-xs">Carbs (g)</label>
                    <input type="number" min={0} className="input" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
                  </div>
                  <div>
                    <label className="label text-xs">Fat (g)</label>
                    <input type="number" min={0} className="input" value={fat} onChange={(e) => setFat(e.target.value)} />
                  </div>
                </div>
                <button type="submit" disabled={saving} className="btn-primary w-full">
                  <IconPlus className="h-4 w-4" /> {saving ? "Adding…" : "Add entry"}
                </button>
              </div>
            </form>

            <div className="space-y-4 lg:col-span-2">
              {MEALS.map((meal) => {
                const entries = day?.entries.filter((e) => e.mealType === meal) ?? [];
                const mealTotal = entries.reduce((s, e) => s + e.calories, 0);
                return (
                  <div key={meal} className="card p-0">
                    <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                      <h3 className="font-semibold capitalize text-slate-900">{meal}</h3>
                      <span className="text-sm font-medium text-slate-500">{Math.round(mealTotal)} kcal</span>
                    </div>
                    {entries.length === 0 ? (
                      <p className="px-5 py-5 text-sm text-slate-400">Nothing logged.</p>
                    ) : (
                      <ul className="divide-y divide-slate-100">
                        {entries.map((entry) => (
                          <li key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-800">{entry.foodName}</p>
                              <p className="text-xs text-slate-400">
                                {Math.round(entry.calories)} kcal
                                {entry.protein != null && ` · P ${entry.protein}g`}
                                {entry.carbs != null && ` · C ${entry.carbs}g`}
                                {entry.fat != null && ` · F ${entry.fat}g`}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="shrink-0 rounded-md p-2 text-slate-300 hover:bg-red-50 hover:text-red-600"
                              aria-label="Delete entry"
                            >
                              <IconTrash className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number | null; color: string }) {
  const pct = target ? Math.min((value / target) * 100, 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className="text-xs text-slate-400">
          {Math.round(value)}
          {target ? `/${target}g` : "g"}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={bold ? "font-semibold text-slate-900" : "text-slate-700"}>{value}</dd>
    </div>
  );
}
