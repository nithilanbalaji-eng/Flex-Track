import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { AuthLayout } from "../components/AuthLayout";
import { ErrorBanner } from "../components/ErrorBanner";
import { GoogleButton } from "../components/GoogleButton";
import { AppleButton } from "../components/AppleButton";
import { extractErrorMessage } from "../api/client";

export function Signup() {
  const { signup, loginWithGoogle, loginWithApple } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /** Social sign-up creates an account too, so it needs consent first. */
  const requireConsent = () => {
    if (!accepted) {
      setError("Please accept the Privacy Policy to continue.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!requireConsent()) return;

    setLoading(true);
    try {
      await signup(name, email, password);
      navigate("/coach");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Start planning workouts with your crew in under a minute.">
      <div className="space-y-3">
        <div onClickCapture={(e) => !accepted && (e.preventDefault(), e.stopPropagation(), requireConsent())}>
          <GoogleButton
            text="signup_with"
            onToken={(idToken) =>
              loginWithGoogle(idToken, true)
                .then(() => navigate("/coach"))
                .catch((err) => setError(extractErrorMessage(err)))
            }
          />
        </div>
        <div onClickCapture={(e) => !accepted && (e.preventDefault(), e.stopPropagation(), requireConsent())}>
          <AppleButton
            onToken={(token, n) =>
              loginWithApple(token, n, true)
                .then(() => navigate("/coach"))
                .catch((err) => setError(extractErrorMessage(err)))
            }
            onError={setError}
          />
        </div>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs font-medium uppercase text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        or
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <ErrorBanner message={error} />
        <div>
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input id="name" required className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
        </div>

        <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-3.5">
          <input
            id="acceptPrivacy"
            type="checkbox"
            required
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-slate-600">
            I've read and accept the{" "}
            <Link to="/privacy" target="_blank" className="font-semibold text-brand-600 underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </span>
        </label>

        <button type="submit" disabled={loading || !accepted} className="btn-primary w-full">
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
