import { api } from "./client";
import { CalorieEntry, CalorieTarget } from "../types";

export interface DaySummary {
  date: string;
  entries: CalorieEntry[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  target: CalorieTarget | null;
}

export const caloriesApi = {
  getDay: (date: string) => api.get<DaySummary>("/calories", { params: { date } }).then((r) => r.data),
  create: (data: Omit<CalorieEntry, "id">) =>
    api.post<{ entry: CalorieEntry }>("/calories", data).then((r) => r.data.entry),
  remove: (id: string) => api.delete(`/calories/${id}`),
};
