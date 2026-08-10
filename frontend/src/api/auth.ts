import { api } from "./client";
import { User } from "../types";

export interface AuthResponse {
  token: string;
  user: User;
}

export const authApi = {
  signup: (data: { name: string; email: string; password: string }) =>
    api.post<AuthResponse>("/auth/signup", data).then((r) => r.data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>("/auth/login", data).then((r) => r.data),

  google: (idToken: string) => api.post<AuthResponse>("/auth/google", { idToken }).then((r) => r.data),

  apple: (identityToken: string, fullName?: string) =>
    api.post<AuthResponse>("/auth/apple", { identityToken, fullName }).then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>("/auth/forgot-password", { email }).then((r) => r.data),

  resetPassword: (token: string, password: string) =>
    api.post<AuthResponse>("/auth/reset-password", { token, password }).then((r) => r.data),

  me: () => api.get<{ user: User }>("/auth/me").then((r) => r.data.user),

  updateProfile: (data: Partial<User>) => api.put<{ user: User }>("/auth/me", data).then((r) => r.data.user),

  rotateHealthKey: () => api.post<{ user: User }>("/auth/me/rotate-health-key").then((r) => r.data.user),
};
