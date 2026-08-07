import { env } from "../config/env";

export interface WorkoutQuestionnaire {
  age: number;
  sex: "male" | "female" | "other";
  heightCm: number;
  weightKg: number;
  goal: "muscle_gain" | "fat_loss" | "maintenance" | "strength" | "endurance";
  experience: "beginner" | "intermediate" | "advanced";
  daysPerWeek: number;
  equipment: "full_gym" | "home_basic" | "bodyweight_only";
  injuries?: string;
  activityLevel: "sedentary" | "light" | "moderate" | "active" | "very_active";
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
  exercises: GeneratedExercise[];
}

export interface GeneratedPlan {
  name: string;
  description: string;
  days: GeneratedDay[];
  coachNotes: string;
  source: "claude" | "rule_based";
}

const EXERCISE_LIBRARY: Record<
  "full_gym" | "home_basic" | "bodyweight_only",
  Record<"push" | "pull" | "legs" | "core" | "cardio", string[]>
> = {
  full_gym: {
    push: ["Barbell Bench Press", "Overhead Press", "Incline Dumbbell Press", "Cable Tricep Pushdown", "Dips"],
    pull: ["Barbell Row", "Lat Pulldown", "Seated Cable Row", "Face Pull", "Barbell Curl"],
    legs: ["Barbell Back Squat", "Romanian Deadlift", "Leg Press", "Walking Lunges", "Standing Calf Raise"],
    core: ["Hanging Leg Raise", "Cable Woodchopper", "Plank", "Weighted Sit-up"],
    cardio: ["Treadmill Intervals", "Rowing Machine", "Assault Bike Sprints", "StairMaster"],
  },
  home_basic: {
    push: ["Dumbbell Bench Press", "Dumbbell Shoulder Press", "Push-ups", "Dumbbell Tricep Extension"],
    pull: ["Dumbbell Row", "Resistance Band Pull-Apart", "Doorframe Rows", "Dumbbell Curl"],
    legs: ["Goblet Squat", "Dumbbell Romanian Deadlift", "Bulgarian Split Squat", "Dumbbell Calf Raise"],
    core: ["Plank", "Russian Twist", "Bicycle Crunch", "Dead Bug"],
    cardio: ["Jump Rope", "Shadow Boxing", "Mountain Climbers", "Burpees"],
  },
  bodyweight_only: {
    push: ["Push-ups", "Pike Push-ups", "Diamond Push-ups", "Tricep Dips (chair)"],
    pull: ["Doorframe Rows", "Towel Rows", "Superman Pulls", "Reverse Snow Angels"],
    legs: ["Bodyweight Squat", "Walking Lunges", "Bulgarian Split Squat", "Glute Bridge", "Calf Raise"],
    core: ["Plank", "Hollow Body Hold", "Bicycle Crunch", "Leg Raises"],
    cardio: ["Jumping Jacks", "High Knees", "Burpees", "Mountain Climbers"],
  },
};

function repsAndRestFor(goal: WorkoutQuestionnaire["goal"], experience: WorkoutQuestionnaire["experience"]) {
  if (goal === "strength") return { reps: experience === "beginner" ? "5-6" : "3-5", rest: 150, sets: 5 };
  if (goal === "muscle_gain") return { reps: "8-12", rest: 90, sets: 4 };
  if (goal === "fat_loss") return { reps: "12-15", rest: 45, sets: 3 };
  if (goal === "endurance") return { reps: "15-20", rest: 30, sets: 3 };
  return { reps: "10-12", rest: 60, sets: 3 }; // maintenance
}

const SPLITS: Record<number, { title: string; groups: ("push" | "pull" | "legs" | "core" | "cardio")[] }[]> = {
  1: [{ title: "Full Body", groups: ["legs", "push", "pull", "core"] }],
  2: [
    { title: "Upper Body", groups: ["push", "pull", "core"] },
    { title: "Lower Body", groups: ["legs", "cardio"] },
  ],
  3: [
    { title: "Push Day (Chest, Shoulders, Triceps)", groups: ["push", "core"] },
    { title: "Pull Day (Back, Biceps)", groups: ["pull", "core"] },
    { title: "Leg Day", groups: ["legs", "cardio"] },
  ],
  4: [
    { title: "Upper Body Strength", groups: ["push", "pull"] },
    { title: "Lower Body Strength", groups: ["legs"] },
    { title: "Push Focus", groups: ["push", "core"] },
    { title: "Pull & Legs Accessory", groups: ["pull", "legs", "cardio"] },
  ],
  5: [
    { title: "Push", groups: ["push"] },
    { title: "Pull", groups: ["pull"] },
    { title: "Legs", groups: ["legs"] },
    { title: "Upper Body Accessory", groups: ["push", "pull", "core"] },
    { title: "Conditioning & Core", groups: ["cardio", "core"] },
  ],
  6: [
    { title: "Push", groups: ["push"] },
    { title: "Pull", groups: ["pull"] },
    { title: "Legs", groups: ["legs"] },
    { title: "Push", groups: ["push", "core"] },
    { title: "Pull", groups: ["pull", "core"] },
    { title: "Legs & Conditioning", groups: ["legs", "cardio"] },
  ],
  7: [
    { title: "Push", groups: ["push"] },
    { title: "Pull", groups: ["pull"] },
    { title: "Legs", groups: ["legs"] },
    { title: "Active Recovery / Core", groups: ["core", "cardio"] },
    { title: "Push", groups: ["push"] },
    { title: "Pull", groups: ["pull"] },
    { title: "Legs & Conditioning", groups: ["legs", "cardio"] },
  ],
};

/** Deterministic, always-available generator used when no LLM key is configured (or as a fallback). */
export function generateRuleBasedPlan(q: WorkoutQuestionnaire): GeneratedPlan {
  const days = Math.min(Math.max(q.daysPerWeek, 1), 7);
  const split = SPLITS[days];
  const library = EXERCISE_LIBRARY[q.equipment];
  const { reps, rest, sets } = repsAndRestFor(q.goal, q.experience);

  // Track how far into each muscle-group pool we've drawn so repeat days
  // (e.g. two push days in a PPL x2 split) get different accessory work.
  const poolCursor: Record<string, number> = {};

  const generatedDays: GeneratedDay[] = split.map((dayDef, idx) => {
    const exercises: GeneratedExercise[] = [];
    for (const group of dayDef.groups) {
      const pool = library[group];
      const count = group === "core" || group === "cardio" ? 1 : 2;
      for (let i = 0; i < count; i++) {
        const cursor = poolCursor[group] ?? 0;
        const name = pool[cursor % pool.length];
        poolCursor[group] = cursor + 1;
        exercises.push({
          name,
          sets: group === "cardio" ? 1 : sets,
          reps: group === "cardio" ? "15-20 min" : reps,
          restSeconds: group === "cardio" ? 60 : rest,
          // Surface the injury reminder once per day, on the opening movement.
          notes:
            q.injuries && exercises.length === 0
              ? `Working around: ${q.injuries}. Swap anything that causes sharp pain for a pain-free alternative.`
              : undefined,
        });
      }
    }
    return { dayNumber: idx + 1, title: dayDef.title, exercises };
  });

  const goalLabel = q.goal
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
  return {
    name: `${days}-Day ${goalLabel} Plan`,
    description: `Auto-generated ${days}-day/week program for a ${q.experience} lifter focused on ${goalLabel.toLowerCase()}, using ${q.equipment.replace("_", " ")} equipment.`,
    days: generatedDays,
    coachNotes:
      `Built for a ${q.age}-year-old, ${q.weightKg}kg, ${q.heightCm}cm ${q.sex} at ${q.activityLevel.replace("_", " ")} activity. ` +
      `Progress by adding a small amount of weight or 1-2 reps once every set hits the top of the rep range. ` +
      `Warm up 5-10 minutes before each session and prioritize sleep and protein intake for recovery.` +
      (q.injuries ? ` Noted limitation: ${q.injuries} — stop any movement that causes sharp pain.` : ""),
    source: "rule_based",
  };
}

const SYSTEM_PROMPT = `You are Flex Track's certified strength & conditioning AI coach. Given a user's profile,
design a safe, effective, periodized workout plan. Always reply with ONLY strict JSON matching this TypeScript type,
no markdown, no commentary outside the JSON:

{
  "name": string,
  "description": string,
  "days": { "dayNumber": number, "title": string, "exercises": { "name": string, "sets": number, "reps": string, "restSeconds": number, "notes"?: string }[] }[],
  "coachNotes": string
}

Rules:
- Respect the user's available equipment and any injuries/limitations (avoid contraindicated movements, suggest safe alternatives).
- Match volume/intensity/rep ranges to their stated goal and experience level.
- Number of days in "days" must equal the requested daysPerWeek.
- Keep exercise names realistic and well known.
- coachNotes should be encouraging, specific, and mention progression + recovery guidance.`;

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
        max_tokens: 4096,
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

    // Claude may wrap JSON in a code fence despite instructions - strip it defensively.
    const jsonText = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "");
    const parsed = JSON.parse(jsonText);
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
