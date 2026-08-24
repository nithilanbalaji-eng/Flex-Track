export type Goal = "muscle_gain" | "fat_loss" | "maintenance" | "strength" | "endurance";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active";
export type Experience = "beginner" | "intermediate" | "advanced";
export type Equipment = "full_gym" | "home_basic" | "bodyweight_only";
export type Sex = "male" | "female" | "other";

export interface User {
  id: string;
  email: string;
  name: string;
  provider: string;
  avatarUrl: string | null;
  age: number | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: Goal | null;
  activityLevel: ActivityLevel | null;
  experience: Experience | null;
  equipment: Equipment | null;
  healthApiKey: string;
  isPremium: boolean;
  premiumUntil: string | null;
  showAds: boolean;
  privacyAcceptedAt: string | null;
  /** True until the user accepts the current privacy policy version. */
  needsPrivacyConsent: boolean;
  privacyPolicyVersion: string;
}

export interface Exercise {
  id?: string;
  name: string;
  sets: number;
  reps: string;
  restSeconds?: number;
  notes?: string;
}

export interface WorkoutDay {
  id?: string;
  dayNumber: number;
  title: string;
  targetMinutes?: number | null;
  estimatedMinutes?: number | null;
  exercises: Exercise[];
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description?: string | null;
  goal?: string | null;
  daysPerWeek?: number | null;
  isAiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: { id: string; name: string; avatarUrl: string | null };
  group?: { id: string; name: string } | null;
  days: WorkoutDay[];
  shares: { id: string; user: { id: string; name: string; avatarUrl: string | null } }[];
}

export interface Group {
  id: string;
  name: string;
  inviteCode: string;
  myRole?: string;
  members: { id: string; role: string; user: { id: string; name: string; email: string; avatarUrl: string | null } }[];
}

export interface GymLog {
  id: string;
  date: string;
  durationMinutes?: number | null;
  notes?: string | null;
  caloriesBurned?: number | null;
  source: string;
  planId?: string | null;
  planDayId?: string | null;
  plan?: { id: string; name: string } | null;
  planDay?: { id: string; dayNumber: number; title: string } | null;
}

/** How much history the gym log calendar is showing. */
export type LogRange = "week" | "month" | "6months" | "year";

export interface SubscriptionStatus {
  isPremium: boolean;
  showAds: boolean;
  premiumUntil: string | null;
  store: string | null;
  priceUsd: number;
  productId: string;
}

export interface GymLogSummary {
  totalSessions: number;
  sessionsLast30Days: number;
  currentStreak: number;
  longestStreak: number;
  totalCaloriesBurned: number;
}

export interface CalorieEntry {
  id: string;
  date: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  foodName: string;
  calories: number;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
}

export interface CalorieTarget {
  bmr: number | null;
  tdee: number | null;
  target: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
}

export interface HealthSync {
  id: string;
  workoutType?: string | null;
  startDate: string;
  endDate?: string | null;
  caloriesBurned: number;
  source: string;
}

export interface GeneratedPlan {
  name: string;
  description: string;
  days: WorkoutDay[];
  coachNotes: string;
  source: "claude" | "rule_based";
}

/** A crew is a group of friends who train together and share plans. */
export type Crew = Group;
