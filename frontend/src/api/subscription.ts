import { api } from "./client";
import { SubscriptionStatus } from "../types";

export const subscriptionApi = {
  status: () => api.get<SubscriptionStatus>("/subscription").then((r) => r.data),

  /** Web checkout. Returns 501 until a payment provider is configured. */
  checkout: () => api.post<{ url: string }>("/subscription/checkout").then((r) => r.data),

  /** iOS only: hand StoreKit's transaction to the server to grant premium. */
  verifyApple: (originalTransactionId: string, expiresAtMs?: number) =>
    api
      .post<SubscriptionStatus>("/subscription/apple/verify", { originalTransactionId, expiresAtMs })
      .then((r) => r.data),

  cancel: () => api.post<SubscriptionStatus>("/subscription/cancel").then((r) => r.data),

  /** Development helper for exercising the premium UI without paying. */
  devActivate: () => api.post<SubscriptionStatus>("/subscription/dev-activate").then((r) => r.data),
};
