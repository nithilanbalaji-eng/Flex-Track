interface ProfileForCalc {
  sex?: string | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  activityLevel?: string | null;
  goal?: string | null;
}

const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_ADJUSTMENT: Record<string, number> = {
  fat_loss: -500,
  muscle_gain: 350,
  strength: 250,
  endurance: 150,
  maintenance: 0,
};

/** Mifflin-St Jeor BMR, then scaled by activity level and nudged toward the user's goal. */
export function estimateCalorieTarget(profile: ProfileForCalc): {
  bmr: number | null;
  tdee: number | null;
  target: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
} {
  const { sex, age, heightCm, weightKg, activityLevel, goal } = profile;

  if (!age || !heightCm || !weightKg) {
    return { bmr: null, tdee: null, target: null, proteinGrams: null, carbsGrams: null, fatGrams: null };
  }

  const sexOffset = sex === "female" ? -161 : sex === "male" ? 5 : -78; // avg of male/female offsets for "other"
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexOffset;

  const activityMultiplier = ACTIVITY_MULTIPLIERS[activityLevel ?? "moderate"] ?? 1.55;
  const tdee = bmr * activityMultiplier;

  const adjustment = GOAL_ADJUSTMENT[goal ?? "maintenance"] ?? 0;
  const target = Math.round(tdee + adjustment);

  // Macro split: protein anchored to bodyweight, fat as % of calories, remainder carbs.
  const proteinPerKg = goal === "muscle_gain" || goal === "strength" ? 2.0 : goal === "fat_loss" ? 2.2 : 1.6;
  const proteinGrams = Math.round(weightKg * proteinPerKg);
  const fatGrams = Math.round((target * 0.27) / 9);
  const remainingCalories = Math.max(target - proteinGrams * 4 - fatGrams * 9, 0);
  const carbsGrams = Math.round(remainingCalories / 4);

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target,
    proteinGrams,
    carbsGrams,
    fatGrams,
  };
}
