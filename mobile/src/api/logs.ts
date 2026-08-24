import { api } from "./client";
import { GymLog, GymLogSummary, LogRange } from "./../types";

export const logsApi = {
  list: (range: LogRange = "6months") =>
    api.get<{ logs: GymLog[]; range: LogRange }>("/logs", { params: { range } }).then((r) => r.data.logs),

  summary: () => api.get<GymLogSummary>("/logs/summary").then((r) => r.data),

  create: (data: {
    date: string;
    durationMinutes?: number;
    notes?: string;
    caloriesBurned?: number;
    planId?: string;
    planDayId?: string;
  }) => api.post<{ log: GymLog }>("/logs", data).then((r) => r.data.log),

  remove: (id: string) => api.delete(`/logs/${id}`),
};
