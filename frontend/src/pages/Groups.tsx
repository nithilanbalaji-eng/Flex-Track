import { FormEvent, useEffect, useState } from "react";
import { groupsApi } from "../api/groups";
import { Group } from "../types";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { ErrorBanner } from "../components/ErrorBanner";
import { EmptyState } from "../components/EmptyState";
import { IconUsers, IconPlus } from "../components/icons";
import { extractErrorMessage } from "../api/client";

export function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const load = () => groupsApi.list().then(setGroups);

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
      await load();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async (groupId: string) => {
    if (!confirm("Leave this group?")) return;
    await groupsApi.leave(groupId);
    await load();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
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
      <PageHeader
        title="Gym Crew"
        description="Create a group for the people you train with, then share plans with everyone at once."
      />

      <ErrorBanner message={error} />

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <form onSubmit={handleCreate} className="card">
          <h2 className="font-semibold text-slate-900">Create a group</h2>
          <p className="mt-1 text-sm text-slate-500">You'll get an invite code to send to your friends.</p>
          <div className="mt-4 flex gap-2">
            <input
              required
              className="input"
              placeholder="Downtown Gym Crew"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <button type="submit" disabled={busy} className="btn-primary shrink-0">
              <IconPlus className="h-4 w-4" /> Create
            </button>
          </div>
        </form>

        <form onSubmit={handleJoin} className="card">
          <h2 className="font-semibold text-slate-900">Join a group</h2>
          <p className="mt-1 text-sm text-slate-500">Got an invite code from a training partner? Enter it here.</p>
          <div className="mt-4 flex gap-2">
            <input
              required
              className="input uppercase tracking-widest"
              placeholder="ABC1234"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
            <button type="submit" disabled={busy} className="btn-secondary shrink-0">
              Join
            </button>
          </div>
        </form>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          title="You're not in any groups yet"
          description="Create one above and send the invite code to the people you train with."
          icon={<IconUsers className="h-8 w-8" />}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map((group) => (
            <div key={group.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{group.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {group.members.length} {group.members.length === 1 ? "member" : "members"}
                    {group.myRole === "owner" && " · you're the owner"}
                  </p>
                </div>
                <button onClick={() => handleLeave(group.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">
                  Leave
                </button>
              </div>

              <button
                onClick={() => copyCode(group.inviteCode)}
                className="mt-4 flex w-full items-center justify-between rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-left transition-colors hover:border-brand-400 hover:bg-brand-50"
              >
                <span>
                  <span className="block text-xs text-slate-400">Invite code</span>
                  <span className="font-mono text-sm font-semibold tracking-widest text-slate-800">{group.inviteCode}</span>
                </span>
                <span className="text-xs font-medium text-brand-600">{copied === group.inviteCode ? "Copied!" : "Copy"}</span>
              </button>

              <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                {group.members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                      {m.user.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-700">
                        {m.user.name}
                        {m.user.id === user?.id && <span className="ml-1 text-xs text-slate-400">(you)</span>}
                      </p>
                      <p className="truncate text-xs text-slate-400">{m.user.email}</p>
                    </div>
                    {m.role === "owner" && <span className="ml-auto badge">Owner</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
