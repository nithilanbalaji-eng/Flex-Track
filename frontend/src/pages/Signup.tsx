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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
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
        <GoogleButton
          text="signup_with"
          onToken={(idToken) => loginWithGoogle(idToken).then(() => navigate("/coach")).catch((err) => setError(extractErrorMessage(err)))}
        />
        <AppleButton
          onToken={(token, n) => loginWithApple(token, n).then(() => navigate("/coach")).catch((err) => setError(extractErrorMessage(err)))}
          onError={setError}
        />
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
        <button type="submit" disabled={loading} className="btn-primary w-full">
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
