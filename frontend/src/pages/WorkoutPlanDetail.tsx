import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { plansApi } from "../api/plans";
import { WorkoutPlan } from "../types";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { IconTrash, IconUsers } from "../components/icons";
import { extractErrorMessage } from "../api/client";

export function WorkoutPlanDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    plansApi
      .get(id)
      .then(setPlan)
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const isOwner = plan?.createdBy.id === user?.id;

  const handleShare = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSharing(true);
    setError(null);
    setShareMessage(null);
    try {
      const updated = await plansApi.share(id, shareEmail);
      setPlan(updated);
      setShareMessage(`Shared with ${shareEmail}`);
      setShareEmail("");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSharing(false);
    }
  };

  const handleUnshare = async (userId: string) => {
    if (!id) return;
    await plansApi.unshare(id, userId);
    setPlan(await plansApi.get(id));
  };

  const handleDelete = async () => {
    if (!id || !confirm("Delete this workout plan? This can't be undone.")) return;
    await plansApi.remove(id);
    navigate("/plans");
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div>
        <ErrorBanner message={error ?? "Plan not found"} />
        <Link to="/plans" className="btn-secondary mt-4">
          Back to plans
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/plans" className="text-sm font-medium text-slate-500 hover:text-slate-700">
        ← Back to plans
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{plan.name}</h1>
          {plan.description && <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{plan.description}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {plan.daysPerWeek ?? plan.days.length} days/week
            </span>
            {plan.goal && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {plan.goal.replace("_", " ")}
              </span>
            )}
            {plan.isAiGenerated && <span className="badge">AI generated</span>}
            {plan.group && (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                {plan.group.name}
              </span>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="flex shrink-0 gap-2">
            <Link to={`/plans/${plan.id}/edit`} className="btn-secondary">
              Edit
            </Link>
            <button onClick={handleDelete} className="btn-danger">
              <IconTrash className="h-4 w-4" /> Delete
            </button>
          </div>
        )}
      </div>

      <div className="mt-6"><ErrorBanner message={error} /></div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {plan.days.map((day) => (
            <div key={day.id ?? day.dayNumber} className="card">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
                  {day.dayNumber}
                </div>
                <h2 className="font-semibold text-slate-900">{day.title}</h2>
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
                      <tr key={ex.id ?? i}>
                        <td className="py-3 pr-4 font-medium text-slate-800">
                          {ex.name}
                          {ex.notes && <p className="mt-0.5 text-xs font-normal text-slate-400">{ex.notes}</p>}
                        </td>
                        <td className="py-3 pr-4 text-slate-600">{ex.sets}</td>
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

        <div className="space-y-4">
          <div className="card">
            <div className="mb-4 flex items-center gap-2">
              <IconUsers className="h-5 w-5 text-slate-400" />
              <h2 className="font-semibold text-slate-900">Shared with</h2>
            </div>

            {plan.shares.length === 0 ? (
              <p className="text-sm text-slate-400">Not shared with anyone yet.</p>
            ) : (
              <ul className="space-y-2">
                {plan.shares.map((share) => (
                  <li key={share.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">{share.user.name}</span>
                    {isOwner && (
                      <button
                        onClick={() => handleUnshare(share.user.id)}
                        className="text-xs font-medium text-slate-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {isOwner && (
              <form onSubmit={handleShare} className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                <label className="label" htmlFor="shareEmail">
                  Share with a gym buddy
                </label>
                <input
                  id="shareEmail"
                  type="email"
                  required
                  className="input"
                  placeholder="their@email.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                />
                <button type="submit" disabled={sharing} className="btn-primary w-full">
                  {sharing ? "Sharing…" : "Share plan"}
                </button>
                {shareMessage && <p className="text-xs font-medium text-emerald-600">{shareMessage}</p>}
              </form>
            )}
          </div>

          <div className="card">
            <h2 className="mb-2 font-semibold text-slate-900">Created by</h2>
            <p className="text-sm text-slate-600">{plan.createdBy.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
