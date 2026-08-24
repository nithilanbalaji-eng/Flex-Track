import { api } from "./client";
import { HealthSync } from "../types";

export const healthApi = {
  synced: () => api.get<{ syncs: HealthSync[] }>("/health/synced").then((r) => r.data.syncs),
};
