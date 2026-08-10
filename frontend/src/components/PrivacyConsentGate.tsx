import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { ErrorBanner } from "./ErrorBanner";
import { Logo } from "./Logo";
import { extractErrorMessage } from "../api/client";

/**
 * Blocks the app until the current privacy policy has been accepted.
 *
 * The signup checkbox covers people who register with email. This catches
 * everyone it can't: accounts created through Google or Apple, anyone who
 * registered before the policy existed, and — once the version constant is
 * bumped — everyone who only ever accepted an older revision.
 */
export function PrivacyConsentGate({ children }: { children: React.ReactNode }) {
  const { user, setUser, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !user.needsPrivacyConsent) return <>{children}</>;

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      setUser(await authApi.acceptPrivacy());
    } catch (err) {
      setError(extractErrorMessage(err));
      setBusy(false);
    }
  };

  const isUpdate = Boolean(user.privacyAcceptedAt);

  return (
    <div className="min-h-[100dvh] bg-slate-100">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[480px] flex-col bg-white px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] shadow-xl sm:border-x sm:border-slate-200">
        <Logo />

        <div className="mt-10 flex-1">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isUpdate ? "We've updated our Privacy Policy" : "Before you start"}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {isUpdate
              ? "Our Privacy Policy has changed since you last accepted it. Please review and accept the new version to carry on using Flex Track."
              : "Flex Track stores your training, nutrition and any health data you connect. Please read and accept our Privacy Policy to continue."}
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800">In short</p>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
              <li>• Your health and fitness data is never used for ads, and never sold.</li>
              <li>• Only crews you join can see plans you share with them.</li>
              <li>• You can delete your account and all of its data at any time.</li>
            </ul>
            <Link
              to="/privacy"
              target="_blank"
              className="mt-3 inline-block text-sm font-semibold text-brand-600 underline underline-offset-2"
            >
              Read the full Privacy Policy
            </Link>
          </div>

          <div className="mt-5">
            <ErrorBanner message={error} />
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <button onClick={accept} disabled={busy} className="btn-primary w-full">
            {busy ? "Saving…" : "Accept and continue"}
          </button>
          <button onClick={logout} className="btn-ghost w-full">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
