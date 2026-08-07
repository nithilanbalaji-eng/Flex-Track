import { api } from "./client";
import { GymLog, GymLogSummary } from "../types";

export const logsApi = {
  list: () => api.get<{ logs: GymLog[] }>("/logs").then((r) => r.data.logs),
  summary: () => api.get<GymLogSummary>("/logs/summary").then((r) => r.data),
  create: (data: { date: string; durationMinutes?: number; notes?: string; caloriesBurned?: number }) =>
    api.post<{ log: GymLog }>("/logs", data).then((r) => r.data.log),
  remove: (id: string) => api.delete(`/logs/${id}`),
};
