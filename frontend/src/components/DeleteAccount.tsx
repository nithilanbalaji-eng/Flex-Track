import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { ErrorBanner } from "./ErrorBanner";
import { IconTrash } from "./icons";
import { extractErrorMessage } from "../api/client";

/**
 * Permanent account deletion.
 *
 * App Store Guideline 5.1.1(v) requires this to be reachable from inside the
 * app, so it lives on the Settings screen rather than behind a support email.
 * The confirmation step spells out exactly what disappears, because it can't
 * be undone.
 */
export function DeleteAccount() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usesPassword = user?.provider === "local";

  const handleDelete = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authApi.deleteAccount(usesPassword ? { password } : { confirmation });
      logout();
      navigate("/signup", { replace: true });
    } catch (err) {
      setError(extractErrorMessage(err));
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="card mt-6 border-red-200">
        <h2 className="font-semibold text-slate-900">Delete account</h2>
        <p className="mt-1 text-sm text-slate-500">
          Permanently removes your account and everything in it. This can't be undone.
        </p>
        <button onClick={() => setOpen(true)} className="btn-danger mt-4 w-full">
          <IconTrash className="h-4 w-4" /> Delete my account
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleDelete} className="card mt-6 border-red-300 bg-red-50/40">
      <h2 className="font-semibold text-red-900">Delete your account?</h2>

      <p className="mt-2 text-sm text-slate-600">This permanently deletes:</p>
      <ul className="mt-2 space-y-1 text-sm text-slate-600">
        <li>• Your profile and sign-in details</li>
        <li>• Every gym session and calorie entry you've logged</li>
        <li>• Workout plans you created — including for anyone you shared them with</li>
        <li>• Your Apple Health sync history and key</li>
      </ul>
      <p className="mt-3 text-sm text-slate-600">
        Crews you joined stay for the other members. Crews where you're the only member are removed.
      </p>

      {user?.isPremium && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          You have an active subscription. Deleting your account here does <strong>not</strong> cancel billing —
          cancel it in your App Store subscription settings, or from the Premium screen, first.
        </p>
      )}

      <div className="mt-4">
        <ErrorBanner message={error} />
      </div>

      {usesPassword ? (
        <div className="mt-4">
          <label className="label" htmlFor="deletePassword">
            Confirm with your password
          </label>
          <input
            id="deletePassword"
            type="password"
            required
            autoFocus
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      ) : (
        <div className="mt-4">
          <label className="label" htmlFor="deleteConfirm">
            Type DELETE to confirm
          </label>
          <input
            id="deleteConfirm"
            required
            autoFocus
            className="input uppercase tracking-widest"
            placeholder="DELETE"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={busy} className="btn flex-1 bg-red-600 text-white active:bg-red-700">
          {busy ? "Deleting…" : "Delete permanently"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
            setPassword("");
            setConfirmation("");
          }}
          className="btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
