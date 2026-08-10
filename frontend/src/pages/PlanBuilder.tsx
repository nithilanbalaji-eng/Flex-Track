import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { plansApi } from "../api/plans";
import { groupsApi } from "../api/groups";
import { Group, WorkoutDay } from "../types";
import { PageHeader } from "../components/PageHeader";
import { ErrorBanner } from "../components/ErrorBanner";
import { Spinner } from "../components/Spinner";
import { IconPlus, IconTrash } from "../components/icons";
import { DayBadge } from "../components/DayBadge";
import { extractErrorMessage } from "../api/client";

const emptyDay = (dayNumber: number): WorkoutDay => ({
  dayNumber,
  title: `Day ${dayNumber}`,
  exercises: [{ name: "", sets: 3, reps: "8-12", restSeconds: 90 }],
});

export function PlanBuilder() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [groupId, setGroupId] = useState("");
  const [days, setDays] = useState<WorkoutDay[]>([emptyDay(1)]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    groupsApi.list().then(setGroups).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!id) return;
    plansApi
      .get(id)
      .then((plan) => {
        setName(plan.name);
        setDescription(plan.description ?? "");
        setGoal(plan.goal ?? "");
        setGroupId(plan.group?.id ?? "");
        setDays(plan.days.length ? plan.days : [emptyDay(1)]);
      })
      .catch((err) => setError(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const updateDay = (index: number, patch: Partial<WorkoutDay>) =>
    setDays((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));

  const updateExercise = (dayIdx: number, exIdx: number, patch: Partial<WorkoutDay["exercises"][0]>) =>
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx ? { ...d, exercises: d.exercises.map((e, j) => (j === exIdx ? { ...e, ...patch } : e)) } : d
      )
    );

  const addExercise = (dayIdx: number) =>
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx ? { ...d, exercises: [...d.exercises, { name: "", sets: 3, reps: "8-12", restSeconds: 90 }] } : d
      )
    );

  const removeExercise = (dayIdx: number, exIdx: number) =>
    setDays((prev) =>
      prev.map((d, i) => (i === dayIdx ? { ...d, exercises: d.exercises.filter((_, j) => j !== exIdx) } : d))
    );

  const addDay = () => setDays((prev) => [...prev, emptyDay(prev.length + 1)]);

  const removeDay = (index: number) =>
    setDays((prev) => prev.filter((_, i) => i !== index).map((d, i) => ({ ...d, dayNumber: i + 1 })));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleaned = days
      .map((d) => ({ ...d, exercises: d.exercises.filter((ex) => ex.name.trim()) }))
      .filter((d) => d.exercises.length > 0);

    if (cleaned.length === 0) {
      setError("Add at least one day with one named exercise.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        description: description || undefined,
        goal: goal || undefined,
        daysPerWeek: cleaned.length,
        groupId: groupId || undefined,
        days: cleaned,
      };
      const plan = isEdit ? await plansApi.update(id!, payload) : await plansApi.create(payload);
      navigate(`/plans/${plan.id}`);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        title={isEdit ? "Edit workout plan" : "Create a workout plan"}
        description="Build the split day by day. Share it with your group once it's ready."
        action={
          <div className="flex gap-2">
            <Link to="/plans" className="btn-secondary">
              Cancel
            </Link>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create plan"}
            </button>
          </div>
        }
      />

      <ErrorBanner message={error} />

      <div className="card mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="planName">
              Plan name
            </label>
            <input
              id="planName"
              required
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Push Pull Legs"
            />
          </div>
          <div>
            <label className="label" htmlFor="planGoal">
              Goal
            </label>
            <select id="planGoal" className="input" value={goal} onChange={(e) => setGoal(e.target.value)}>
              <option value="">Not specified</option>
              <option value="muscle_gain">Muscle gain</option>
              <option value="fat_loss">Fat loss</option>
              <option value="strength">Strength</option>
              <option value="endurance">Endurance</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="planDescription">
            Description
          </label>
          <textarea
            id="planDescription"
            className="input min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this plan is for, how to progress, notes for your crew…"
          />
        </div>

        {!isEdit && (
          <div>
            <label className="label" htmlFor="planGroup">
              Share with a group (optional)
            </label>
            <select id="planGroup" className="input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">Just me</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-400">
              Everyone in the group can see plans assigned to it.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 space-y-4">
        {days.map((day, dayIdx) => (
          <div key={dayIdx} className="card">
            <div className="mb-4 flex items-center gap-3">
              <DayBadge dayNumber={day.dayNumber} />
              <input
                className="input flex-1 font-semibold"
                value={day.title}
                onChange={(e) => updateDay(dayIdx, { title: e.target.value })}
                placeholder="Push Day (Chest, Shoulders, Triceps)"
              />
              {days.length > 1 && (
                <button type="button" onClick={() => removeDay(dayIdx)} className="btn-danger shrink-0 px-3">
                  <IconTrash className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-2">
              {day.exercises.map((ex, exIdx) => (
                <div key={exIdx} className="grid grid-cols-12 gap-2">
                  <input
                    className="input col-span-12 sm:col-span-5"
                    placeholder="Exercise name"
                    value={ex.name}
                    onChange={(e) => updateExercise(dayIdx, exIdx, { name: e.target.value })}
                  />
                  <input
                    type="number"
                    min={1}
                    className="input col-span-3 sm:col-span-2"
                    placeholder="Sets"
                    value={ex.sets}
                    onChange={(e) => updateExercise(dayIdx, exIdx, { sets: Number(e.target.value) })}
                  />
                  <input
                    className="input col-span-4 sm:col-span-2"
                    placeholder="Reps"
                    value={ex.reps}
                    onChange={(e) => updateExercise(dayIdx, exIdx, { reps: e.target.value })}
                  />
                  <input
                    type="number"
                    min={0}
                    className="input col-span-4 sm:col-span-2"
                    placeholder="Rest (s)"
                    value={ex.restSeconds ?? ""}
                    onChange={(e) => updateExercise(dayIdx, exIdx, { restSeconds: Number(e.target.value) })}
                  />
                  <button
                    type="button"
                    onClick={() => removeExercise(dayIdx, exIdx)}
                    className="col-span-1 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove exercise"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => addExercise(dayIdx)} className="btn-ghost mt-3 text-sm">
              <IconPlus className="h-4 w-4" /> Add exercise
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={addDay} className="btn-secondary mt-4 w-full">
        <IconPlus className="h-4 w-4" /> Add training day
      </button>
    </form>
  );
}
