import { FormEvent, useEffect, useState } from "react";
import { groupsApi } from "../api/groups";
import { Crew } from "../types";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { AdSlot } from "../components/AdSlot";
import { IconUsers, IconPlus, IconChevronRight } from "../components/icons";
import { extractErrorMessage } from "../api/client";

type Mode = "none" | "create" | "join";

export function Crews() {
  const { user } = useAuth();
  const [crews, setCrews] = useState<Crew[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("none");
  const [newName, setNewName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = () => groupsApi.list().then(setCrews);

  useEffect(() => {
    load()
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await groupsApi.create(newName);
      setNewName("");
      setMode("none");
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await groupsApi.join(inviteCode.trim().toUpperCase());
      setInviteCode("");
      setMode("none");
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async (crewId: string) => {
    if (!confirm("Leave this crew? You'll lose access to plans shared with it.")) return;
    await groupsApi.leave(crewId);
    await load();
  };

  const share = async (crew: Crew) => {
    const message = `Join my crew "${crew.name}" on Flex Track — invite code ${crew.inviteCode}`;
    // Use the native share sheet on mobile, fall back to the clipboard.
    if (navigator.share) {
      try {
        await navigator.share({ title: "Flex Track", text: message });
        return;
      } catch {
        /* user dismissed the sheet — fall through to copying */
      }
    }
    navigator.clipboard.writeText(crew.inviteCode);
    setCopied(crew.inviteCode);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Crews" description="The people you train with. Share plans, keep each other honest." />

      <ErrorBanner message={error} />

      {/* Find or create — the two primary actions, always one tap away. */}
      {mode === "none" && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <button onClick={() => setMode("create")} className="card flex flex-col items-start gap-2 text-left active:bg-slate-50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <IconPlus className="h-5 w-5" />
            </div>
            <span className="font-semibold text-slate-900">Create a crew</span>
            <span className="text-xs text-slate-500">Start one and invite your friends</span>
          </button>

          <button onClick={() => setMode("join")} className="card flex flex-col items-start gap-2 text-left active:bg-slate-50">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <IconUsers className="h-5 w-5" />
            </div>
            <span className="font-semibold text-slate-900">Join a crew</span>
            <span className="text-xs text-slate-500">Enter an invite code you were sent</span>
          </button>
        </div>
      )}

      {mode === "create" && (
        <form onSubmit={handleCreate} className="card mb-6">
          <h2 className="font-semibold text-slate-900">Name your crew</h2>
          <p className="mt-1 text-sm text-slate-500">You'll get an invite code to send to your training partners.</p>
          <input
            required
            autoFocus
            className="input mt-4"
            placeholder="Downtown Gym Crew"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary flex-1">
              {busy ? "Creating…" : "Create crew"}
            </button>
            <button type="button" onClick={() => setMode("none")} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === "join" && (
        <form onSubmit={handleJoin} className="card mb-6">
          <h2 className="font-semibold text-slate-900">Enter invite code</h2>
          <p className="mt-1 text-sm text-slate-500">Ask whoever created the crew to send you their code.</p>
          <input
            required
            autoFocus
            maxLength={10}
            className="input mt-4 text-center font-mono text-lg uppercase tracking-[0.3em]"
            placeholder="ABC1234"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button type="submit" disabled={busy} className="btn-primary flex-1">
              {busy ? "Joining…" : "Join crew"}
            </button>
            <button type="button" onClick={() => setMode("none")} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {crews.length === 0 ? (
        <EmptyState
          title="You're not in a crew yet"
          description="Training with people makes you show up. Create a crew and send the code to your gym friends."
          icon={<IconUsers className="h-8 w-8" />}
        />
      ) : (
        <div className="space-y-4">
          {crews.map((crew) => (
            <div key={crew.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-900">{crew.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {crew.members.length} {crew.members.length === 1 ? "member" : "members"}
                    {crew.myRole === "owner" && " · you started it"}
                  </p>
                </div>
                <button onClick={() => handleLeave(crew.id)} className="shrink-0 text-xs font-medium text-slate-400 active:text-red-600">
                  Leave
                </button>
              </div>

              <button
                onClick={() => share(crew)}
                className="mt-4 flex w-full items-center justify-between rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-left active:border-brand-400 active:bg-brand-50"
              >
                <span className="min-w-0">
                  <span className="block text-xs text-slate-400">Invite code</span>
                  <span className="font-mono text-base font-semibold tracking-[0.2em] text-slate-800">{crew.inviteCode}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-brand-600">
                  {copied === crew.inviteCode ? "Copied!" : "Invite"}
                  <IconChevronRight className="h-4 w-4" />
                </span>
              </button>

              <ul className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                {crew.members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                      {m.user.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">
                        {m.user.name}
                        {m.user.id === user?.id && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-slate-400">{m.user.email}</p>
                    </div>
                    {m.role === "owner" && <span className="badge shrink-0">Owner</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <AdSlot placement="crews" />
    </div>
  );
}
