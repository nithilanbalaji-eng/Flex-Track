import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { aiApi, Questionnaire } from "../api/ai";
import { GeneratedPlan, Goal, Experience, Equipment, ActivityLevel, Sex } from "../types";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { ErrorBanner } from "../components/ErrorBanner";
import { Spinner } from "../components/Spinner";
import { IconSparkles } from "../components/icons";
import { DayBadge, DurationBadge } from "../components/DayBadge";
import { MedicalDisclaimer } from "../components/MedicalDisclaimer";
import { extractErrorMessage } from "../api/client";

const STEPS = ["About you", "Your goal", "Your training", "Your schedule", "Review"] as const;

/** Quick-pick session lengths, in minutes. */
const DURATION_PRESETS = [30, 45, 60, 75, 90];
const DEFAULT_SESSION_MINUTES = 60;

interface OptionCardProps<T extends string> {
  value: T;
  selected: T | undefined;
  onSelect: (v: T) => void;
  title: string;
  description?: string;
}

function OptionCard<T extends string>({ value, selected, onSelect, title, description }: OptionCardProps<T>) {
  const isSelected = selected === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`rounded-xl border p-4 text-left transition-all ${
        isSelected
          ? "border-brand-500 bg-brand-50 ring-2 ring-brand-100"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <p className={`font-semibold ${isSelected ? "text-brand-800" : "text-slate-800"}`}>{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </button>
  );
}

export function AICoach() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Partial<Questionnaire>>({
    age: user?.age ?? undefined,
    sex: user?.sex ?? undefined,
    heightCm: user?.heightCm ?? undefined,
    weightKg: user?.weightKg ?? undefined,
    goal: user?.goal ?? undefined,
    experience: user?.experience ?? undefined,
    equipment: user?.equipment ?? undefined,
    activityLevel: user?.activityLevel ?? undefined,
    daysPerWeek: 4,
    saveProfile: true,
  });

  const [plan, setPlan] = useState<GeneratedPlan | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Questionnaire>(key: K, value: Questionnaire[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const days = form.daysPerWeek ?? 4;

  /** Minutes available on a given training day, defaulting to an hour. */
  const minutesFor = (index: number) => form.dayMinutes?.[index] ?? DEFAULT_SESSION_MINUTES;

  const setMinutesFor = (index: number, value: number) => {
    const next = Array.from({ length: days }, (_, i) => (i === index ? value : minutesFor(i)));
    set("dayMinutes", next);
  };

  const setAllMinutes = (value: number) => set("dayMinutes", Array.from({ length: days }, () => value));

  const stepValid = () => {
    if (step === 0) return Boolean(form.age && form.sex && form.heightCm && form.weightKg);
    if (step === 1) return Boolean(form.goal && form.activityLevel);
    if (step === 2) return Boolean(form.experience && form.equipment && form.daysPerWeek);
    return true;
  };

  const handleGenerate = async () => {
    setError(null);
    setGenerating(true);
    try {
      // Always send one duration per training day — the API rejects a mismatch,
      // and the user may have skipped past the schedule step.
      const payload: Questionnaire = {
        ...(form as Questionnaire),
        dayMinutes: Array.from({ length: days }, (_, i) => minutesFor(i)),
      };
      const generated = await aiApi.generatePlan(payload);
      setPlan(generated);
      if (form.saveProfile) await refreshUser();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!plan) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await aiApi.savePlan(plan);
      navigate(`/plans/${saved.id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
      setSaving(false);
    }
  };

  if (plan) {
    return (
      <div>
        <PageHeader
          title="Your personalized plan"
          description={
            plan.source === "claude"
              ? "Designed by Flex Track's AI coach based on your answers."
              : "Built by Flex Track's built-in coaching engine based on your answers."
          }
          action={
            <div className="flex gap-2">
              <button onClick={() => setPlan(null)} className="btn-secondary">
                Start over
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? "Saving…" : "Save to my plans"}
              </button>
            </div>
          }
        />

        <ErrorBanner message={error} />

        <div className="card mb-6 border-brand-200 bg-gradient-to-br from-brand-50 to-white">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
              <IconSparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">{plan.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
              <p className="mt-3 rounded-lg bg-white/70 p-3 text-sm leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-800">Coach's notes: </span>
                {plan.coachNotes}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {plan.days.map((day) => (
            <div key={day.dayNumber} className="card">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <DayBadge dayNumber={day.dayNumber} />
                <DurationBadge minutes={day.targetMinutes} />
                {day.estimatedMinutes != null && day.targetMinutes != null && (
                  <span className="text-xs text-slate-400">≈{day.estimatedMinutes} min planned</span>
                )}
                <h3 className="w-full font-semibold text-slate-900">{day.title}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                      <th className="pb-2 pr-4 font-medium">Exercise</th>
                      <th className="pb-2 pr-4 font-medium">Sets</th>
                      <th className="pb-2 pr-4 font-medium">Reps</th>
                      <th className="pb-2 font-medium">Rest</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {day.exercises.map((ex, i) => (
                      <tr key={i}>
                        <td className="py-3 pr-4 font-medium text-slate-800">
                          {ex.name}
                          {ex.notes && <p className="mt-0.5 text-xs font-normal text-slate-400">{ex.notes}</p>}
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{ex.sets || "—"}</td>
                        <td className="py-3 pr-4 text-slate-600">{ex.reps}</td>
                        <td className="py-3 text-slate-600">{ex.restSeconds ? `${ex.restSeconds}s` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <MedicalDisclaimer />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="AI Coach"
        description="Answer a few questions and we'll design a program built around your body, goals and schedule."
      />

      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                i <= step ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-500"
              }`}
            >
              {i + 1}
            </div>
            <span className={`hidden text-sm font-medium sm:block ${i <= step ? "text-slate-800" : "text-slate-400"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < step ? "bg-brand-600" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>

      <ErrorBanner message={error} />

      <div className="card mt-4">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="font-semibold text-slate-900">Tell us about you</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Age</label>
                <input
                  type="number"
                  className="input"
                  min={10}
                  max={100}
                  value={form.age ?? ""}
                  onChange={(e) => set("age", Number(e.target.value))}
                  placeholder="28"
                />
              </div>
              <div>
                <label className="label">Weight (kg)</label>
                <input
                  type="number"
                  className="input"
                  min={20}
                  max={400}
                  step="0.1"
                  value={form.weightKg ?? ""}
                  onChange={(e) => set("weightKg", Number(e.target.value))}
                  placeholder="82"
                />
              </div>
              <div>
                <label className="label">Height (cm)</label>
                <input
                  type="number"
                  className="input"
                  min={50}
                  max={260}
                  value={form.heightCm ?? ""}
                  onChange={(e) => set("heightCm", Number(e.target.value))}
                  placeholder="178"
                />
              </div>
              <div>
                <label className="label">Sex</label>
                <select className="input" value={form.sex ?? ""} onChange={(e) => set("sex", e.target.value as Sex)}>
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other / prefer not to say</option>
                </select>
                <p className="mt-1.5 text-xs text-slate-400">Used only to estimate your metabolic rate.</p>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 font-semibold text-slate-900">What's your main goal?</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <OptionCard<Goal> value="muscle_gain" selected={form.goal} onSelect={(v) => set("goal", v)} title="Build muscle" description="Hypertrophy focus, moderate reps" />
                <OptionCard<Goal> value="fat_loss" selected={form.goal} onSelect={(v) => set("goal", v)} title="Lose fat" description="Higher reps, shorter rest, calorie deficit" />
                <OptionCard<Goal> value="strength" selected={form.goal} onSelect={(v) => set("goal", v)} title="Get stronger" description="Heavy compounds, low reps, long rest" />
                <OptionCard<Goal> value="endurance" selected={form.goal} onSelect={(v) => set("goal", v)} title="Build endurance" description="High reps, conditioning work" />
                <OptionCard<Goal> value="maintenance" selected={form.goal} onSelect={(v) => set("goal", v)} title="Stay in shape" description="Balanced training, maintain weight" />
              </div>
            </div>

            <div>
              <h2 className="mb-3 font-semibold text-slate-900">How active is your day-to-day life?</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <OptionCard<ActivityLevel> value="sedentary" selected={form.activityLevel} onSelect={(v) => set("activityLevel", v)} title="Sedentary" description="Desk job, little movement" />
                <OptionCard<ActivityLevel> value="light" selected={form.activityLevel} onSelect={(v) => set("activityLevel", v)} title="Lightly active" description="Light exercise 1-3 days/week" />
                <OptionCard<ActivityLevel> value="moderate" selected={form.activityLevel} onSelect={(v) => set("activityLevel", v)} title="Moderately active" description="Exercise 3-5 days/week" />
                <OptionCard<ActivityLevel> value="active" selected={form.activityLevel} onSelect={(v) => set("activityLevel", v)} title="Very active" description="Hard exercise 6-7 days/week" />
                <OptionCard<ActivityLevel> value="very_active" selected={form.activityLevel} onSelect={(v) => set("activityLevel", v)} title="Athlete" description="Training twice a day or physical job" />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="mb-3 font-semibold text-slate-900">How much lifting experience do you have?</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <OptionCard<Experience> value="beginner" selected={form.experience} onSelect={(v) => set("experience", v)} title="Beginner" description="Under 1 year" />
                <OptionCard<Experience> value="intermediate" selected={form.experience} onSelect={(v) => set("experience", v)} title="Intermediate" description="1-3 years" />
                <OptionCard<Experience> value="advanced" selected={form.experience} onSelect={(v) => set("experience", v)} title="Advanced" description="3+ years" />
              </div>
            </div>

            <div>
              <h2 className="mb-3 font-semibold text-slate-900">What equipment do you have?</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <OptionCard<Equipment> value="full_gym" selected={form.equipment} onSelect={(v) => set("equipment", v)} title="Full gym" description="Barbells, machines, cables" />
                <OptionCard<Equipment> value="home_basic" selected={form.equipment} onSelect={(v) => set("equipment", v)} title="Home setup" description="Dumbbells, bands" />
                <OptionCard<Equipment> value="bodyweight_only" selected={form.equipment} onSelect={(v) => set("equipment", v)} title="Bodyweight" description="No equipment" />
              </div>
            </div>

            <div>
              <label className="label">How many days per week can you train?</label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set("daysPerWeek", n)}
                    className={`h-11 w-11 rounded-lg border font-semibold transition-colors ${
                      form.daysPerWeek === n
                        ? "border-brand-500 bg-brand-600 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Any injuries or limitations? (optional)</label>
              <textarea
                className="input min-h-[70px]"
                placeholder="e.g. lower back pain, bad left shoulder, avoid overhead pressing"
                value={form.injuries ?? ""}
                onChange={(e) => set("injuries", e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-slate-900">How long can you train each day?</h2>
              <p className="mt-1 text-sm text-slate-500">
                Some days you've got an hour and a half, some days you've got half an hour. Set each one and
                your coach will size that session to fit — no more running out of time halfway through.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
              <span className="text-xs font-medium text-slate-500">Same every day:</span>
              {DURATION_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAllMinutes(m)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 active:bg-slate-100"
                >
                  {m}m
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {Array.from({ length: days }, (_, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800">Day {i + 1}</span>
                    <span className="text-sm font-medium text-brand-600">{minutesFor(i)} min</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DURATION_PRESETS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMinutesFor(i, m)}
                        className={`h-10 flex-1 rounded-lg border text-sm font-semibold transition-colors ${
                          minutesFor(i) === m
                            ? "border-brand-500 bg-brand-600 text-white"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min={15}
                    max={180}
                    step={5}
                    value={minutesFor(i)}
                    onChange={(e) => setMinutesFor(i, Number(e.target.value))}
                    className="mt-3 w-full accent-brand-600"
                    aria-label={`Minutes available on day ${i + 1}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="font-semibold text-slate-900">Ready to build your plan</h2>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Review label="Age" value={form.age} />
              <Review label="Weight" value={form.weightKg && `${form.weightKg} kg`} />
              <Review label="Height" value={form.heightCm && `${form.heightCm} cm`} />
              <Review label="Sex" value={form.sex} />
              <Review label="Goal" value={form.goal?.replace("_", " ")} />
              <Review label="Activity level" value={form.activityLevel?.replace("_", " ")} />
              <Review label="Experience" value={form.experience} />
              <Review label="Equipment" value={form.equipment?.replace("_", " ")} />
              <Review label="Days per week" value={form.daysPerWeek} />
              <Review
                label="Session lengths"
                value={Array.from({ length: days }, (_, i) => `${minutesFor(i)}m`).join(" · ")}
              />
              <Review label="Limitations" value={form.injuries || "None"} />
            </dl>

            <label className="flex items-start gap-3 rounded-lg bg-slate-50 p-4">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={form.saveProfile ?? true}
                onChange={(e) => set("saveProfile", e.target.checked)}
              />
              <span className="text-sm text-slate-600">
                Save these details to my profile so Flex Track can calculate my calorie and macro targets.
              </span>
            </label>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-secondary"
          >
            Back
          </button>

          {step < STEPS.length - 1 ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!stepValid()} className="btn-primary">
              Continue
            </button>
          ) : (
            <button type="button" onClick={handleGenerate} disabled={generating} className="btn-primary">
              {generating ? (
                <>
                  <Spinner className="h-4 w-4 border-white/40 border-t-white" /> Designing your plan…
                </>
              ) : (
                <>
                  <IconSparkles className="h-4 w-4" /> Generate my plan
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <MedicalDisclaimer />
    </div>
  );
}

function Review({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-2">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-medium capitalize text-slate-800">{value ?? "—"}</dd>
    </div>
  );
}
