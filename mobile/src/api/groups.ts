import { api } from "./client";
import { Group } from "../types";

export const groupsApi = {
  list: () => api.get<{ groups: Group[] }>("/groups").then((r) => r.data.groups),
  create: (name: string) => api.post<{ group: Group }>("/groups", { name }).then((r) => r.data.group),
  join: (inviteCode: string) => api.post<{ group: Group }>("/groups/join", { inviteCode }).then((r) => r.data.group),
  leave: (groupId: string) => api.delete(`/groups/${groupId}/leave`),
};
