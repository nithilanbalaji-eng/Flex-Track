import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../api/auth";
import { healthApi } from "../api/health";
import { HealthSync, Goal, ActivityLevel, Experience, Equipment, Sex } from "../types";
import { PageHeader } from "../components/PageHeader";
import { ErrorBanner } from "../components/ErrorBanner";
import { IconApple, IconSparkles, IconChevronRight } from "../components/icons";
import { DeleteAccount } from "../components/DeleteAccount";
import { extractErrorMessage } from "../api/client";

export function Settings() {
  const { user, setUser } = useAuth();
  const [syncs, setSyncs] = useState<HealthSync[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealKey, setRevealKey] = useState(false);

  const [form, setForm] = useState({
    name: user?.name ?? "",
    age: user?.age?.toString() ?? "",
    sex: (user?.sex ?? "") as Sex | "",
    heightCm: user?.heightCm?.toString() ?? "",
    weightKg: user?.weightKg?.toString() ?? "",
    goal: (user?.goal ?? "") as Goal | "",
    activityLevel: (user?.activityLevel ?? "") as ActivityLevel | "",
    experience: (user?.experience ?? "") as Experience | "",
    equipment: (user?.equipment ?? "") as Equipment | "",
  });

  useEffect(() => {
    healthApi.synced().then(setSyncs).catch(() => undefined);
  }, []);

  const webhookUrl = `${window.location.origin}/api/health/webhook`;

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await authApi.updateProfile({
        name: form.name,
        age: form.age ? Number(form.age) : undefined,
        sex: form.sex || undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        goal: form.goal || undefined,
        activityLevel: form.activityLevel || undefined,
        experience: form.experience || undefined,
        equipment: form.equipment || undefined,
      } as never);
      setUser(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRotate = async () => {
    if (!confirm("Generate a new Apple Health key? Your existing shortcut will stop working until you update it.")) return;
    const updated = await authApi.rotateHealthKey();
    setUser(updated);
  };

  const copyPayload = () => {
    const payload = JSON.stringify(
      {
        healthApiKey: user?.healthApiKey,
        workouts: [
          { workoutType: "Traditional Strength Training", startDate: "2026-01-15T18:00:00Z", endDate: "2026-01-15T19:10:00Z", caloriesBurned: 480 },
        ],
      },
      null,
      2
    );
    navigator.clipboard.writeText(payload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <PageHeader title="Settings" description="Your profile powers calorie targets and AI plan personalization." />

      <ErrorBanner message={error} />

      {/* Subscription status, right at the top where people look for it. */}
      <Link
        to="/premium"
        className={`card mb-6 flex items-center gap-3 active:bg-slate-50 ${
          user?.isPremium ? "border-brand-200 bg-brand-50" : ""
        }`}
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            user?.isPremium ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          <IconSparkles className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{user?.isPremium ? "Premium" : "Flex Track Premium"}</p>
          <p className="text-sm text-slate-500">
            {user?.isPremium
              ? user.premiumUntil
                ? `Renews ${format(parseISO(user.premiumUntil), "d MMM yyyy")}`
                : "Active — no ads"
              : "Remove ads for $2.99/month"}
          </p>
        </div>
        <IconChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={handleSave} className="card lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Profile</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Email</label>
              <input className="input bg-slate-50 text-slate-500" value={user?.email ?? ""} disabled />
              <p className="mt-1.5 text-xs text-slate-400">
                Signed in with {user?.provider === "local" ? "email & password" : user?.provider}.
              </p>
            </div>

            <div>
              <label className="label">Age</label>
              <input type="number" min={10} max={100} className="input" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
            </div>
            <div>
              <label className="label">Sex</label>
              <select className="input" value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value as Sex })}>
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Height (cm)</label>
              <input type="number" className="input" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} />
            </div>
            <div>
              <label className="label">Weight (kg)</label>
              <input type="number" step="0.1" className="input" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
            </div>

            <div>
              <label className="label">Goal</label>
              <select className="input" value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value as Goal })}>
                <option value="">Select…</option>
                <option value="muscle_gain">Build muscle</option>
                <option value="fat_loss">Lose fat</option>
                <option value="strength">Get stronger</option>
                <option value="endurance">Build endurance</option>
                <option value="maintenance">Maintain</option>
              </select>
            </div>
            <div>
              <label className="label">Activity level</label>
              <select
                className="input"
                value={form.activityLevel}
                onChange={(e) => setForm({ ...form, activityLevel: e.target.value as ActivityLevel })}
              >
                <option value="">Select…</option>
                <option value="sedentary">Sedentary</option>
                <option value="light">Lightly active</option>
                <option value="moderate">Moderately active</option>
                <option value="active">Very active</option>
                <option value="very_active">Athlete</option>
              </select>
            </div>
            <div>
              <label className="label">Experience</label>
              <select className="input" value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value as Experience })}>
                <option value="">Select…</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label className="label">Equipment</label>
              <select className="input" value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value as Equipment })}>
                <option value="">Select…</option>
                <option value="full_gym">Full gym</option>
                <option value="home_basic">Home setup</option>
                <option value="bodyweight_only">Bodyweight only</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : "Save changes"}
            </button>
            {saved && <span className="text-sm font-medium text-emerald-600">Saved!</span>}
          </div>
        </form>

        <div className="space-y-4">
          <div className="card">
            <div className="mb-4 flex items-center gap-2">
              <IconApple className="h-5 w-5 text-slate-700" />
              <h2 className="font-semibold text-slate-900">Apple Health</h2>
            </div>

            <p className="text-sm text-slate-600">
              Send your workouts and active energy from Apple Health straight into Flex Track. Every synced workout
              also lands in your gym log, so your streaks stay accurate.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Webhook URL</label>
                <code className="block break-all rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100">{webhookUrl}</code>
              </div>

              <div>
                <label className="label">Your personal key</label>
                <div className="flex gap-2">
                  <code className="flex-1 break-all rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-700">
                    {revealKey ? user?.healthApiKey : "•".repeat(32)}
                  </code>
                  <button type="button" onClick={() => setRevealKey((v) => !v)} className="btn-secondary shrink-0 px-3 text-xs">
                    {revealKey ? "Hide" : "Show"}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">Treat this like a password — it authorizes writes to your log.</p>
              </div>

              <button type="button" onClick={copyPayload} className="btn-secondary w-full text-sm">
                {copied ? "Copied!" : "Copy example payload"}
              </button>
              <button type="button" onClick={handleRotate} className="btn-danger w-full text-sm">
                Generate new key
              </button>
            </div>

            <details className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
              <summary className="cursor-pointer font-medium text-slate-700">How to set this up</summary>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs leading-relaxed text-slate-600">
                <li>
                  Install a HealthKit export app on your iPhone (e.g. <span className="font-medium">Health Auto Export</span>), or
                  build a Shortcuts automation.
                </li>
                <li>Add a REST API / webhook destination pointing at the URL above, using POST + JSON.</li>
                <li>
                  Include your personal key as <code className="rounded bg-white px-1">healthApiKey</code> and your workouts under a{" "}
                  <code className="rounded bg-white px-1">workouts</code> array with{" "}
                  <code className="rounded bg-white px-1">startDate</code> and{" "}
                  <code className="rounded bg-white px-1">caloriesBurned</code>.
                </li>
                <li>Run it once — synced workouts appear below and in your gym log.</li>
              </ol>
            </details>
          </div>

          <div className="card">
            <h2 className="font-semibold text-slate-900">Recently synced</h2>
            {syncs.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">Nothing synced from Apple Health yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {syncs.slice(0, 8).map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{s.workoutType ?? "Workout"}</p>
                      <p className="text-xs text-slate-400">{format(parseISO(s.startDate), "MMM d, yyyy · h:mm a")}</p>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-orange-600">{Math.round(s.caloriesBurned)} kcal</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <DeleteAccount />

      <p className="mt-6 text-center text-xs text-slate-400">
        <Link to="/privacy" className="underline decoration-slate-300 underline-offset-2">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
