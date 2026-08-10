import { env } from "../config/env";
import {
  ExerciseDef,
  MuscleGroup,
  availableExercises,
  parseInjuries,
  Equipment,
  Experience,
} from "./exerciseLibrary";

export interface WorkoutQuestionnaire {
  age: number;
  sex: "male" | "female" | "other";
  heightCm: number;
  weightKg: number;
  goal: "muscle_gain" | "fat_loss" | "maintenance" | "strength" | "endurance";
  experience: Experience;
  daysPerWeek: number;
  equipment: Equipment;
  injuries?: string;
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
  /**
   * Minutes available for each training day, in order. Length should match
   * daysPerWeek — short days get a trimmed session, long days get more
   * accessory work, so a busy Tuesday doesn't get the same plan as a free
   * Saturday.
   */
  dayMinutes?: number[];
}

export interface GeneratedExercise {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
}

export interface GeneratedDay {
  dayNumber: number;
  title: string;
  /** What the user said they had available. */
  targetMinutes?: number;
  /** What this session should actually take, including warm-up and rest. */
  estimatedMinutes?: number;
  exercises: GeneratedExercise[];
}

export interface GeneratedPlan {
  name: string;
  description: string;
  days: GeneratedDay[];
  coachNotes: string;
  source: "claude" | "rule_based";
}

const DEFAULT_DAY_MINUTES = 60;
const WARMUP_MINUTES = 8;

/** A slot the day wants to fill, in priority order. */
interface Slot {
  group: MuscleGroup;
  compound: boolean;
}

type DayType = "push" | "pull" | "legs" | "upper" | "lower" | "full" | "conditioning";

/**
 * Ordered slots per day type. Heavy compounds come first so they're trained
 * fresh; the tail is accessory work that gets dropped on short days.
 */
const DAY_SLOTS: Record<DayType, Slot[]> = {
  push: [
    { group: "chest", compound: true },
    { group: "shoulders", compound: true },
    { group: "chest", compound: false },
    { group: "arms", compound: false },
    { group: "shoulders", compound: false },
    { group: "core", compound: false },
    { group: "arms", compound: false },
  ],
  pull: [
    { group: "back", compound: true },
    { group: "back", compound: true },
    { group: "back", compound: false },
    { group: "arms", compound: false },
    { group: "shoulders", compound: false },
    { group: "core", compound: false },
    { group: "arms", compound: false },
  ],
  legs: [
    { group: "quads", compound: true },
    { group: "posterior", compound: true },
    { group: "quads", compound: true },
    { group: "posterior", compound: false },
    { group: "quads", compound: false },
    { group: "core", compound: false },
    { group: "posterior", compound: false },
  ],
  upper: [
    { group: "chest", compound: true },
    { group: "back", compound: true },
    { group: "shoulders", compound: true },
    { group: "back", compound: false },
    { group: "arms", compound: false },
    { group: "arms", compound: false },
    { group: "core", compound: false },
  ],
  lower: [
    { group: "quads", compound: true },
    { group: "posterior", compound: true },
    { group: "quads", compound: true },
    { group: "posterior", compound: false },
    { group: "core", compound: false },
    { group: "posterior", compound: false },
  ],
  full: [
    { group: "quads", compound: true },
    { group: "chest", compound: true },
    { group: "back", compound: true },
    { group: "posterior", compound: true },
    { group: "shoulders", compound: false },
    { group: "arms", compound: false },
    { group: "core", compound: false },
  ],
  conditioning: [
    { group: "cardio", compound: false },
    { group: "core", compound: false },
    { group: "core", compound: false },
    { group: "cardio", compound: false },
  ],
};

const DAY_TITLES: Record<DayType, string> = {
  push: "Push — Chest, Shoulders & Triceps",
  pull: "Pull — Back & Biceps",
  legs: "Legs",
  upper: "Upper Body",
  lower: "Lower Body",
  full: "Full Body",
  conditioning: "Conditioning & Core",
};

/** Weekly split by training frequency. */
const SPLITS: Record<number, DayType[]> = {
  1: ["full"],
  2: ["upper", "lower"],
  3: ["push", "pull", "legs"],
  4: ["upper", "lower", "push", "pull"],
  5: ["push", "pull", "legs", "upper", "conditioning"],
  6: ["push", "pull", "legs", "push", "pull", "legs"],
  7: ["push", "pull", "legs", "conditioning", "push", "pull", "legs"],
};

interface Prescription {
  sets: number;
  reps: string;
  restSeconds: number;
}

/** Sets, reps and rest depend on the goal, and on whether it's a heavy compound. */
function prescribe(
  goal: WorkoutQuestionnaire["goal"],
  experience: Experience,
  compound: boolean,
  group: MuscleGroup
): Prescription {
  const baseSets = experience === "beginner" ? 3 : experience === "advanced" ? 4 : 3;
  const sets = compound ? baseSets + 1 : baseSets;

  if (group === "core") return { sets: 3, reps: "30-45 sec", restSeconds: 45 };

  switch (goal) {
    case "strength":
      return compound
        ? { sets: sets + 1, reps: experience === "beginner" ? "5" : "3-5", restSeconds: 180 }
        : { sets, reps: "6-8", restSeconds: 90 };
    case "muscle_gain":
      return compound
        ? { sets, reps: "6-8", restSeconds: 120 }
        : { sets, reps: "10-12", restSeconds: 75 };
    case "fat_loss":
      return compound
        ? { sets, reps: "8-10", restSeconds: 60 }
        : { sets, reps: "12-15", restSeconds: 45 };
    case "endurance":
      return { sets, reps: "15-20", restSeconds: 30 };
    default:
      return compound
        ? { sets, reps: "8-10", restSeconds: 90 }
        : { sets, reps: "10-12", restSeconds: 60 };
  }
}

/** Midpoint of a rep range like "8-12", used to estimate time under tension. */
function repsMidpoint(reps: string): number {
  const numbers = reps.match(/\d+/g)?.map(Number) ?? [10];
  if (numbers.length >= 2) return (numbers[0] + numbers[1]) / 2;
  return numbers[0];
}

/** Minutes an exercise consumes, including its rest periods and setup. */
function estimateExerciseMinutes(ex: GeneratedExercise, timed: boolean): number {
  if (timed) {
    const mins = repsMidpoint(ex.reps);
    return mins + 1; // plus transition
  }
  const secondsPerRep = 3;
  const workSeconds = Math.min(Math.max(repsMidpoint(ex.reps) * secondsPerRep, 25), 75);
  const setupSeconds = 45;
  const total = setupSeconds + ex.sets * workSeconds + (ex.sets - 1) * ex.restSeconds;
  return total / 60;
}

function warmupFor(dayType: DayType, age: number): GeneratedExercise {
  // Older lifters get a slightly longer ramp-up.
  const minutes = age >= 45 ? WARMUP_MINUTES + 2 : WARMUP_MINUTES;
  const focus: Record<DayType, string> = {
    push: "arm circles, band pull-aparts, then 2 light ramp-up sets of your first press",
    pull: "band pull-aparts, scapular hangs, then 2 light ramp-up sets of your first row",
    legs: "leg swings, bodyweight squats, then 2 light ramp-up sets of your first squat",
    upper: "arm circles, band pull-aparts, then light ramp-up sets",
    lower: "leg swings, glute bridges, then light ramp-up sets",
    full: "5 minutes easy cardio, then light ramp-up sets on your first lift",
    conditioning: "easy pace for the first 3 minutes, then build",
  };
  return {
    name: "Warm-up",
    sets: 1,
    reps: `${minutes} min`,
    restSeconds: 0,
    notes: focus[dayType],
  };
}

/**
 * Picks an exercise for a slot, preferring movements the rest of the week
 * hasn't already used so a 5-day plan doesn't bench press five times.
 */
function pickForSlot(
  slot: Slot,
  pool: ExerciseDef[],
  usedToday: Set<string>,
  usageAcrossPlan: Map<string, number>
): ExerciseDef | null {
  const rank = (list: ExerciseDef[]) =>
    list
      .filter((e) => !usedToday.has(e.name))
      .sort((a, b) => (usageAcrossPlan.get(a.name) ?? 0) - (usageAcrossPlan.get(b.name) ?? 0));

  const exact = rank(pool.filter((e) => e.group === slot.group && e.compound === slot.compound));
  if (exact.length) return exact[0];

  // Fall back to the same muscle with the other movement type before giving up.
  const sameGroup = rank(pool.filter((e) => e.group === slot.group));
  if (sameGroup.length) return sameGroup[0];

  return null;
}

/** Cap so a very long session doesn't turn into an unmanageable list. */
const MAX_WORKING_MOVEMENTS = 9;

function buildDay(
  dayType: DayType,
  dayNumber: number,
  targetMinutes: number,
  q: WorkoutQuestionnaire,
  pool: ExerciseDef[],
  usageAcrossPlan: Map<string, number>
): GeneratedDay {
  const warmup = warmupFor(dayType, q.age);
  const exercises: GeneratedExercise[] = [warmup];
  let usedMinutes = repsMidpoint(warmup.reps);

  const usedToday = new Set<string>();
  const slots = DAY_SLOTS[dayType];

  const tryAdd = (slot: Slot): "added" | "no_room" | "no_exercise" => {
    const def = pickForSlot(slot, pool, usedToday, usageAcrossPlan);
    if (!def) return "no_exercise";

    const { sets, reps, restSeconds } = prescribe(q.goal, q.experience, def.compound, def.group);
    const candidate: GeneratedExercise = def.timed
      ? { name: def.name, sets: 1, reps: `${Math.max(10, Math.round(targetMinutes * 0.3))} min`, restSeconds: 60 }
      : { name: def.name, sets, reps, restSeconds };

    const cost = estimateExerciseMinutes(candidate, !!def.timed);
    const workingCount = exercises.length - 1;

    // Always keep at least two working movements, even on a very short day.
    if (usedMinutes + cost > targetMinutes && workingCount >= 2) return "no_room";

    exercises.push(candidate);
    usedToday.add(def.name);
    usageAcrossPlan.set(def.name, (usageAcrossPlan.get(def.name) ?? 0) + 1);
    usedMinutes += cost;
    return "added";
  };

  for (const slot of slots) {
    if (tryAdd(slot) === "no_room") break;
  }

  // Long sessions: keep adding accessory work for this day's muscle groups
  // until the time is genuinely used up, so a 90-minute slot isn't half empty.
  const accessoryGroups = slots.filter((s) => s.group !== "cardio").map((s) => s.group);
  const uniqueGroups = Array.from(new Set(accessoryGroups));
  let guard = 0;
  while (exercises.length - 1 < MAX_WORKING_MOVEMENTS && guard < 40) {
    guard++;
    const group = uniqueGroups[guard % uniqueGroups.length];
    const result = tryAdd({ group, compound: false });
    if (result === "no_room") break;
  }

  // Past the movement cap, extra volume is junk volume. If there's still a
  // meaningful chunk of time left, spend it on conditioning and mobility
  // rather than a tenth set of curls.
  const spare = targetMinutes - usedMinutes;
  if (spare >= 12 && dayType !== "conditioning") {
    const finisherMinutes = Math.floor(spare);
    exercises.push({
      name: "Finisher — cardio & mobility",
      sets: 1,
      reps: `${finisherMinutes} min`,
      restSeconds: 0,
      notes:
        "Easy-to-moderate cardio of your choice, then stretch whatever felt tight today. " +
        "Optional — skip it if you're short on time or feeling beaten up.",
    });
    usedMinutes += finisherMinutes;
  }

  return {
    dayNumber,
    title: DAY_TITLES[dayType],
    targetMinutes,
    estimatedMinutes: Math.round(usedMinutes),
    exercises,
  };
}

/** Deterministic generator used when no LLM key is configured, and as a fallback. */
export function generateRuleBasedPlan(q: WorkoutQuestionnaire): GeneratedPlan {
  const days = Math.min(Math.max(q.daysPerWeek, 1), 7);
  const split = SPLITS[days];
  const injuries = parseInjuries(q.injuries);
  const pool = availableExercises(q.equipment, q.experience, injuries);

  const minutesPerDay = (index: number) => {
    const provided = q.dayMinutes?.[index];
    if (provided && provided > 0) return Math.min(Math.max(provided, 15), 180);
    return DEFAULT_DAY_MINUTES;
  };

  // Shared across the week so exercise selection varies between sessions.
  const usageAcrossPlan = new Map<string, number>();
  const generatedDays = split.map((dayType, idx) =>
    buildDay(dayType, idx + 1, minutesPerDay(idx), q, pool, usageAcrossPlan)
  );

  const goalLabel = q.goal
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");

  const shortest = Math.min(...generatedDays.map((d) => d.targetMinutes ?? DEFAULT_DAY_MINUTES));
  const longest = Math.max(...generatedDays.map((d) => d.targetMinutes ?? DEFAULT_DAY_MINUTES));

  const progression =
    q.goal === "strength"
      ? "Add 2.5-5kg to your main lift whenever you complete every prescribed rep. If you miss reps two sessions running, drop 10% and build back."
      : q.goal === "fat_loss"
        ? "Keep rest tight and aim to beat last week's total reps at the same weight. Nutrition drives fat loss - training preserves the muscle underneath."
        : "Once you hit the top of the rep range on every set, add a small amount of weight next session and work back up from the bottom.";

  const injuryNote = injuries.length
    ? ` Movements that commonly aggravate your noted ${injuries.join(", ").replace(/_/g, " ")} issue have been left out of this plan - stop anything that causes sharp pain and swap it for a pain-free alternative.`
    : "";

  return {
    name: `${days}-Day ${goalLabel} Plan`,
    description:
      `A ${days}-day-per-week ${goalLabel.toLowerCase()} program for a ${q.experience} lifter training with ` +
      `${q.equipment.replace(/_/g, " ")}. Sessions are sized to the time you have` +
      (shortest === longest ? ` (${shortest} min each).` : ` (${shortest}-${longest} min).`),
    days: generatedDays,
    coachNotes:
      `Built around a ${q.age}-year-old ${q.sex}, ${q.weightKg}kg at ${q.heightCm}cm, ${q.activityLevel.replace(/_/g, " ")} outside the gym. ` +
      `${progression} ` +
      `Warm up properly before the first heavy set, leave 1-2 reps in reserve on accessory work, and take at least one full rest day each week. ` +
      `Sleep and protein do more for your results than any exercise selection.${injuryNote}`,
    source: "rule_based",
  };
}

const SYSTEM_PROMPT = `You are Flex Track's certified strength & conditioning coach. Design a safe, effective,
individualized training plan from the user's profile. Reply with ONLY strict JSON matching this TypeScript type -
no markdown fences, no commentary outside the JSON:

{
  "name": string,
  "description": string,
  "days": {
    "dayNumber": number,
    "title": string,
    "targetMinutes": number,
    "estimatedMinutes": number,
    "exercises": { "name": string, "sets": number, "reps": string, "restSeconds": number, "notes"?: string }[]
  }[],
  "coachNotes": string
}

Hard requirements:
- "days" length MUST equal daysPerWeek.
- dayMinutes[i] is how long the user has on day i+1. Set targetMinutes to that value and program a session that
  genuinely fits: estimatedMinutes must be within 5 minutes of targetMinutes and must never exceed it.
  Estimate honestly - sets x (working time + restSeconds), plus warm-up.
  A 30-minute day gets 3-4 movements with short rest; a 90-minute day gets full accessory work.
- Start every day with a "Warm-up" entry (sets 1, reps like "8 min") describing a specific ramp-up for that session.
- Order movements heaviest/most technical first, accessories and core last.
- Respect the equipment tier absolutely. Never program barbells or machines for home_basic or bodyweight_only.
- Match exercise complexity to experience: no Olympic lifts, deficit work or advanced gymnastics for beginners.
- If injuries are described, omit every contraindicated movement and say what you substituted and why in coachNotes.
- Rep ranges and rest must serve the stated goal (strength: low reps, long rest; hypertrophy: moderate; fat loss and
  endurance: higher reps, shorter rest).
- coachNotes must be specific to THIS person - reference their goal, experience and schedule, give concrete
  progression rules, and never give medical advice.`;

async function generateWithClaude(q: WorkoutQuestionnaire): Promise<GeneratedPlan | null> {
  if (!env.anthropicApiKey) return null;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.anthropicApiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: env.anthropicModel,
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(q) }],
      }),
    });

    if (!response.ok) {
      console.error("Anthropic API error", response.status, await response.text());
      return null;
    }

    const data = (await response.json()) as { content: { type: string; text?: string }[] };
    const text = data.content.find((c) => c.type === "text")?.text;
    if (!text) return null;

    const jsonText = text
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "");
    const parsed = JSON.parse(jsonText) as GeneratedPlan;

    // Guard against a malformed response slipping through to the UI.
    if (!Array.isArray(parsed.days) || parsed.days.length === 0) return null;
    if (parsed.days.some((d) => !Array.isArray(d.exercises) || d.exercises.length === 0)) return null;

    return { ...parsed, source: "claude" };
  } catch (err) {
    console.error("Claude workout generation failed, falling back to rule-based plan", err);
    return null;
  }
}

export async function generateWorkoutPlan(q: WorkoutQuestionnaire): Promise<GeneratedPlan> {
  const aiPlan = await generateWithClaude(q);
  return aiPlan ?? generateRuleBasedPlan(q);
}
