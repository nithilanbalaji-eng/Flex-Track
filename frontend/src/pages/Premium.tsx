import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { subscriptionApi } from "../api/subscription";
import { SubscriptionStatus } from "../types";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { extractErrorMessage } from "../api/client";
import { IconSparkles, IconChevronRight } from "../components/icons";

const BENEFITS = [
  { title: "No ads, anywhere", body: "Every placement disappears the moment you subscribe." },
  { title: "Unlimited AI plans", body: "Regenerate and refine your programme as often as you like." },
  { title: "Full training history", body: "Keep your entire log instead of the last 12 months." },
  { title: "Support development", body: "Flex Track is built by one person. Subscriptions keep it running." },
];

export function Premium() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => subscriptionApi.status().then(setStatus);

  useEffect(() => {
    load()
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await subscriptionApi.checkout();
      window.location.assign(url);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleDevActivate = async () => {
    setBusy(true);
    setError(null);
    try {
      setStatus(await subscriptionApi.devActivate());
      await refreshUser();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel Premium? You'll keep access until the end of your paid period.")) return;
    setBusy(true);
    try {
      setStatus(await subscriptionApi.cancel());
      await refreshUser();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const active = status?.isPremium;

  return (
    <div>
      <PageHeader title="Flex Track Premium" description="Remove ads and support the app." />

      <ErrorBanner message={error} />

      {active ? (
        <div className="card border-brand-200 bg-brand-50">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
              <IconSparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-brand-900">Premium is active</p>
              {status?.premiumUntil && (
                <p className="text-sm text-brand-700">
                  Renews {format(parseISO(status.premiumUntil), "d MMMM yyyy")}
                </p>
              )}
            </div>
          </div>
          <button onClick={handleCancel} disabled={busy} className="btn-secondary mt-5 w-full">
            Cancel subscription
          </button>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden bg-ink-900 p-0 text-white">
            <div className="relative bg-gradient-to-br from-brand-600 via-brand-700 to-ink-900 px-6 py-8">
              <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
              <div className="relative">
                <IconSparkles className="h-7 w-7" />
                <p className="mt-4 text-3xl font-bold">
                  $2.99<span className="text-base font-medium text-white/60">/month</span>
                </p>
                <p className="mt-1 text-sm text-white/70">Cancel any time.</p>
              </div>
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {BENEFITS.map((b) => (
              <li key={b.title} className="card flex items-start gap-3 py-4">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{b.title}</p>
                  <p className="text-sm text-slate-500">{b.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <button onClick={handleSubscribe} disabled={busy} className="btn-primary mt-6 w-full">
            {busy ? "Opening checkout…" : "Subscribe — $2.99/mo"}
            <IconChevronRight className="h-4 w-4" />
          </button>

          {import.meta.env.DEV && (
            <button onClick={handleDevActivate} disabled={busy} className="btn-secondary mt-3 w-full">
              Dev: activate without paying
            </button>
          )}

          <p className="mt-4 text-center text-xs text-slate-400">
            Payments are processed securely. You can cancel at any time from this page.
          </p>
        </>
      )}

      <button onClick={() => navigate(-1)} className="btn-ghost mt-6 w-full">
        Back
      </button>
    </div>
  );
}
