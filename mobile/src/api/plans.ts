import { api } from "./client";
import { WorkoutPlan, WorkoutDay } from "../types";

export interface PlanInput {
  name: string;
  description?: string;
  goal?: string;
  daysPerWeek?: number;
  groupId?: string;
  isAiGenerated?: boolean;
  days: WorkoutDay[];
}

export const plansApi = {
  list: () => api.get<{ plans: WorkoutPlan[] }>("/plans").then((r) => r.data.plans),
  get: (id: string) => api.get<{ plan: WorkoutPlan }>(`/plans/${id}`).then((r) => r.data.plan),
  create: (data: PlanInput) => api.post<{ plan: WorkoutPlan }>("/plans", data).then((r) => r.data.plan),
  update: (id: string, data: PlanInput) => api.put<{ plan: WorkoutPlan }>(`/plans/${id}`, data).then((r) => r.data.plan),
  remove: (id: string) => api.delete(`/plans/${id}`),
  share: (id: string, email: string) =>
    api.post<{ plan: WorkoutPlan }>(`/plans/${id}/share`, { email }).then((r) => r.data.plan),
  unshare: (id: string, userId: string) => api.delete(`/plans/${id}/share/${userId}`),
};
