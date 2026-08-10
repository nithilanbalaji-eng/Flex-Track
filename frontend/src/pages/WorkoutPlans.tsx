import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { plansApi } from "../api/plans";
import { WorkoutPlan } from "../types";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { EmptyState } from "../components/EmptyState";
import { ErrorBanner } from "../components/ErrorBanner";
import { IconDumbbell, IconPlus, IconSparkles, IconChevronRight } from "../components/icons";
import { AdSlot } from "../components/AdSlot";
import { MedicalDisclaimer } from "../components/MedicalDisclaimer";
import { extractErrorMessage } from "../api/client";

export function WorkoutPlans() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    plansApi
      .list()
      .then(setPlans)
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const mine = plans.filter((p) => p.createdBy.id === user?.id);
  const shared = plans.filter((p) => p.createdBy.id !== user?.id);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Workout Plans"
        description="Plans you've built, plus everything your gym crew has shared with you."
        action={
          <div className="flex gap-3">
            <Link to="/coach" className="btn-secondary">
              <IconSparkles className="h-4 w-4" /> AI Coach
            </Link>
            <Link to="/plans/new" className="btn-primary">
              <IconPlus className="h-4 w-4" /> New plan
            </Link>
          </div>
        }
      />

      <ErrorBanner message={error} />

      {plans.length === 0 ? (
        <EmptyState
          title="No plans yet"
          description="Create a plan from scratch or answer a few questions and let the AI coach build one for you."
          icon={<IconDumbbell className="h-8 w-8" />}
          action={
            <Link to="/coach" className="btn-primary">
              <IconSparkles className="h-4 w-4" /> Generate my first plan
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          <PlanSection title="Created by you" plans={mine} />
          <PlanSection title="Shared with you" plans={shared} />
        </div>
      )}

      <AdSlot placement="plans" />
      <MedicalDisclaimer />
    </div>
  );
}

function PlanSection({ title, plans }: { title: string; plans: WorkoutPlan[] }) {
  if (plans.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Link key={plan.id} to={`/plans/${plan.id}`} className="card flex flex-col transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-semibold text-slate-900">{plan.name}</h3>
              <IconChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
            </div>
            {plan.description && <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">{plan.description}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {plan.daysPerWeek ?? plan.days.length} days/week
              </span>
              {plan.isAiGenerated && <span className="badge">AI generated</span>}
              {plan.group && (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  {plan.group.name}
                </span>
              )}
            </div>

            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
              By {plan.createdBy.name} · updated {format(parseISO(plan.updatedAt), "MMM d, yyyy")}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
