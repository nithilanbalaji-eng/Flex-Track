import { api } from "./client";
import { GeneratedPlan, WorkoutPlan, Goal, Experience, Equipment, ActivityLevel, Sex } from "../types";

export interface Questionnaire {
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  goal: Goal;
  experience: Experience;
  daysPerWeek: number;
  equipment: Equipment;
  injuries?: string;
  activityLevel: ActivityLevel;
  saveProfile?: boolean;
}

export const aiApi = {
  generatePlan: (data: Questionnaire) =>
    api.post<{ plan: GeneratedPlan }>("/ai/generate-plan", data).then((r) => r.data.plan),
  savePlan: (plan: GeneratedPlan) =>
    api
      .post<{ plan: WorkoutPlan }>("/ai/save-plan", {
        name: plan.name,
        description: plan.description,
        days: plan.days,
      })
      .then((r) => r.data.plan),
};
