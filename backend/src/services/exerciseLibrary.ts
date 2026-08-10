/**
 * Exercise catalogue backing the AI coach's rule-based engine.
 *
 * Each movement carries enough metadata to be selected intelligently rather
 * than picked off a flat list: which muscle it trains, whether it's a heavy
 * compound (goes early in a session) or an accessory, the minimum equipment
 * it needs, the experience level it suits, and which injuries rule it out.
 */

export type Equipment = "full_gym" | "home_basic" | "bodyweight_only";
export type Experience = "beginner" | "intermediate" | "advanced";

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "quads"
  | "posterior"
  | "core"
  | "cardio";

/** Injury tags a user's free-text limitation can map onto. */
export type InjuryTag = "knee" | "shoulder" | "lower_back" | "wrist" | "elbow" | "hip" | "ankle" | "neck";

export interface ExerciseDef {
  name: string;
  group: MuscleGroup;
  /** Heavy multi-joint work — programmed first while the lifter is fresh. */
  compound: boolean;
  /** Minimum equipment tier required. */
  requires: Equipment;
  /** Lowest experience level that should attempt it. */
  level: Experience;
  /** Injuries that make this movement a bad idea. */
  avoidWith?: InjuryTag[];
  /** Cardio only: this is a timed block rather than sets/reps. */
  timed?: boolean;
}

/** Equipment tiers are cumulative: a full gym can do everything below it. */
const TIER: Record<Equipment, number> = {
  bodyweight_only: 0,
  home_basic: 1,
  full_gym: 2,
};

const LEVEL: Record<Experience, number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

export const EXERCISES: ExerciseDef[] = [
  // ---------- Chest ----------
  { name: "Barbell Bench Press", group: "chest", compound: true, requires: "full_gym", level: "intermediate", avoidWith: ["shoulder"] },
  { name: "Dumbbell Bench Press", group: "chest", compound: true, requires: "home_basic", level: "beginner" },
  { name: "Incline Dumbbell Press", group: "chest", compound: true, requires: "home_basic", level: "beginner" },
  { name: "Machine Chest Press", group: "chest", compound: true, requires: "full_gym", level: "beginner" },
  { name: "Push-ups", group: "chest", compound: true, requires: "bodyweight_only", level: "beginner", avoidWith: ["wrist"] },
  { name: "Incline Push-ups", group: "chest", compound: true, requires: "bodyweight_only", level: "beginner" },
  { name: "Cable Fly", group: "chest", compound: false, requires: "full_gym", level: "beginner", avoidWith: ["shoulder"] },
  { name: "Dumbbell Fly", group: "chest", compound: false, requires: "home_basic", level: "intermediate", avoidWith: ["shoulder"] },
  { name: "Dips", group: "chest", compound: true, requires: "full_gym", level: "advanced", avoidWith: ["shoulder"] },

  // ---------- Back ----------
  { name: "Barbell Row", group: "back", compound: true, requires: "full_gym", level: "intermediate", avoidWith: ["lower_back"] },
  { name: "Chest-Supported Row", group: "back", compound: true, requires: "full_gym", level: "beginner" },
  { name: "Lat Pulldown", group: "back", compound: true, requires: "full_gym", level: "beginner" },
  { name: "Pull-ups", group: "back", compound: true, requires: "full_gym", level: "advanced", avoidWith: ["shoulder", "elbow"] },
  { name: "Seated Cable Row", group: "back", compound: true, requires: "full_gym", level: "beginner" },
  { name: "Single-Arm Dumbbell Row", group: "back", compound: true, requires: "home_basic", level: "beginner" },
  { name: "Resistance Band Row", group: "back", compound: true, requires: "home_basic", level: "beginner" },
  { name: "Inverted Row", group: "back", compound: true, requires: "bodyweight_only", level: "beginner" },
  { name: "Face Pull", group: "back", compound: false, requires: "full_gym", level: "beginner" },
  { name: "Reverse Snow Angels", group: "back", compound: false, requires: "bodyweight_only", level: "beginner" },
  { name: "Superman Hold", group: "back", compound: false, requires: "bodyweight_only", level: "beginner", avoidWith: ["lower_back"] },

  // ---------- Shoulders ----------
  { name: "Overhead Press", group: "shoulders", compound: true, requires: "full_gym", level: "intermediate", avoidWith: ["shoulder", "lower_back"] },
  { name: "Seated Dumbbell Shoulder Press", group: "shoulders", compound: true, requires: "home_basic", level: "beginner", avoidWith: ["shoulder"] },
  { name: "Pike Push-ups", group: "shoulders", compound: true, requires: "bodyweight_only", level: "intermediate", avoidWith: ["shoulder", "wrist"] },
  { name: "Lateral Raise", group: "shoulders", compound: false, requires: "home_basic", level: "beginner" },
  { name: "Cable Lateral Raise", group: "shoulders", compound: false, requires: "full_gym", level: "beginner" },
  { name: "Rear Delt Fly", group: "shoulders", compound: false, requires: "home_basic", level: "beginner" },

  // ---------- Arms ----------
  { name: "Barbell Curl", group: "arms", compound: false, requires: "full_gym", level: "beginner", avoidWith: ["elbow", "wrist"] },
  { name: "Dumbbell Curl", group: "arms", compound: false, requires: "home_basic", level: "beginner", avoidWith: ["elbow"] },
  { name: "Hammer Curl", group: "arms", compound: false, requires: "home_basic", level: "beginner" },
  { name: "Cable Tricep Pushdown", group: "arms", compound: false, requires: "full_gym", level: "beginner", avoidWith: ["elbow"] },
  { name: "Overhead Tricep Extension", group: "arms", compound: false, requires: "home_basic", level: "beginner", avoidWith: ["elbow", "shoulder"] },
  { name: "Close-Grip Push-ups", group: "arms", compound: false, requires: "bodyweight_only", level: "beginner", avoidWith: ["wrist", "elbow"] },
  { name: "Chair Tricep Dips", group: "arms", compound: false, requires: "bodyweight_only", level: "beginner", avoidWith: ["shoulder", "wrist"] },

  // ---------- Quads ----------
  { name: "Barbell Back Squat", group: "quads", compound: true, requires: "full_gym", level: "intermediate", avoidWith: ["knee", "lower_back"] },
  { name: "Front Squat", group: "quads", compound: true, requires: "full_gym", level: "advanced", avoidWith: ["knee", "wrist"] },
  { name: "Leg Press", group: "quads", compound: true, requires: "full_gym", level: "beginner", avoidWith: ["knee"] },
  { name: "Goblet Squat", group: "quads", compound: true, requires: "home_basic", level: "beginner", avoidWith: ["knee"] },
  { name: "Bulgarian Split Squat", group: "quads", compound: true, requires: "home_basic", level: "intermediate", avoidWith: ["knee"] },
  { name: "Walking Lunges", group: "quads", compound: true, requires: "bodyweight_only", level: "beginner", avoidWith: ["knee"] },
  { name: "Bodyweight Squat", group: "quads", compound: true, requires: "bodyweight_only", level: "beginner", avoidWith: ["knee"] },
  { name: "Step-ups", group: "quads", compound: true, requires: "bodyweight_only", level: "beginner", avoidWith: ["knee"] },
  { name: "Leg Extension", group: "quads", compound: false, requires: "full_gym", level: "beginner", avoidWith: ["knee"] },
  { name: "Wall Sit", group: "quads", compound: false, requires: "bodyweight_only", level: "beginner", avoidWith: ["knee"] },

  // ---------- Posterior chain ----------
  { name: "Romanian Deadlift", group: "posterior", compound: true, requires: "home_basic", level: "intermediate", avoidWith: ["lower_back"] },
  { name: "Conventional Deadlift", group: "posterior", compound: true, requires: "full_gym", level: "advanced", avoidWith: ["lower_back"] },
  { name: "Hip Thrust", group: "posterior", compound: true, requires: "home_basic", level: "beginner" },
  { name: "Glute Bridge", group: "posterior", compound: true, requires: "bodyweight_only", level: "beginner" },
  { name: "Seated Leg Curl", group: "posterior", compound: false, requires: "full_gym", level: "beginner" },
  { name: "Nordic Curl Negative", group: "posterior", compound: false, requires: "bodyweight_only", level: "advanced", avoidWith: ["knee"] },
  { name: "Single-Leg Glute Bridge", group: "posterior", compound: false, requires: "bodyweight_only", level: "beginner" },
  { name: "Standing Calf Raise", group: "posterior", compound: false, requires: "bodyweight_only", level: "beginner", avoidWith: ["ankle"] },

  // ---------- Core ----------
  { name: "Plank", group: "core", compound: false, requires: "bodyweight_only", level: "beginner", avoidWith: ["wrist"] },
  { name: "Dead Bug", group: "core", compound: false, requires: "bodyweight_only", level: "beginner" },
  { name: "Hanging Leg Raise", group: "core", compound: false, requires: "full_gym", level: "advanced", avoidWith: ["shoulder"] },
  { name: "Cable Woodchopper", group: "core", compound: false, requires: "full_gym", level: "intermediate" },
  { name: "Bicycle Crunch", group: "core", compound: false, requires: "bodyweight_only", level: "beginner", avoidWith: ["neck", "lower_back"] },
  { name: "Hollow Body Hold", group: "core", compound: false, requires: "bodyweight_only", level: "intermediate", avoidWith: ["lower_back"] },
  { name: "Side Plank", group: "core", compound: false, requires: "bodyweight_only", level: "beginner", avoidWith: ["shoulder"] },
  { name: "Pallof Press", group: "core", compound: false, requires: "home_basic", level: "beginner" },

  // ---------- Cardio / conditioning ----------
  { name: "Treadmill Intervals", group: "cardio", compound: false, requires: "full_gym", level: "beginner", timed: true, avoidWith: ["knee", "ankle"] },
  { name: "Rowing Machine", group: "cardio", compound: false, requires: "full_gym", level: "beginner", timed: true, avoidWith: ["lower_back"] },
  { name: "Stationary Bike", group: "cardio", compound: false, requires: "full_gym", level: "beginner", timed: true },
  { name: "Incline Walk", group: "cardio", compound: false, requires: "full_gym", level: "beginner", timed: true },
  { name: "Jump Rope", group: "cardio", compound: false, requires: "bodyweight_only", level: "beginner", timed: true, avoidWith: ["knee", "ankle"] },
  { name: "Shadow Boxing", group: "cardio", compound: false, requires: "bodyweight_only", level: "beginner", timed: true },
  { name: "Mountain Climbers", group: "cardio", compound: false, requires: "bodyweight_only", level: "beginner", timed: true, avoidWith: ["wrist", "knee"] },
  { name: "Brisk Walk", group: "cardio", compound: false, requires: "bodyweight_only", level: "beginner", timed: true },
];

/** Maps a user's free-text injury description onto structured tags. */
const INJURY_KEYWORDS: Record<InjuryTag, string[]> = {
  knee: ["knee", "acl", "mcl", "meniscus", "patell"],
  shoulder: ["shoulder", "rotator", "cuff", "labrum", "ac joint"],
  lower_back: ["back", "lumbar", "spine", "disc", "sciatic", "herniat"],
  wrist: ["wrist", "carpal"],
  elbow: ["elbow", "tennis elbow", "golfer"],
  hip: ["hip", "groin", "labral"],
  ankle: ["ankle", "achilles", "shin", "plantar"],
  neck: ["neck", "cervical"],
};

export function parseInjuries(text?: string): InjuryTag[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return (Object.keys(INJURY_KEYWORDS) as InjuryTag[]).filter((tag) =>
    INJURY_KEYWORDS[tag].some((keyword) => lower.includes(keyword))
  );
}

/** Movements the user can actually perform, given kit, experience and injuries. */
export function availableExercises(
  equipment: Equipment,
  experience: Experience,
  injuries: InjuryTag[]
): ExerciseDef[] {
  return EXERCISES.filter((ex) => {
    if (TIER[ex.requires] > TIER[equipment]) return false;
    if (LEVEL[ex.level] > LEVEL[experience]) return false;
    if (ex.avoidWith?.some((tag) => injuries.includes(tag))) return false;
    return true;
  });
}
