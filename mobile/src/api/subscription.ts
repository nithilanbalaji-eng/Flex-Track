import { api } from "./client";
import { SubscriptionStatus } from "../types";

export const subscriptionApi = {
  status: () => api.get<SubscriptionStatus>("/subscription").then((r) => r.data),

  /** Web checkout. Returns 501 until a payment provider is configured. */
  checkout: () => api.post<{ url: string }>("/subscription/checkout").then((r) => r.data),

  /**
   * iOS only: hand the App Store receipt to the server, which verifies it with
   * Apple and decides entitlement. The client never asserts that it paid.
   */
  verifyApple: (receipt: string) =>
    api.post<SubscriptionStatus>("/subscription/apple/verify", { receipt }).then((r) => r.data),

  cancel: () => api.post<SubscriptionStatus>("/subscription/cancel").then((r) => r.data),

  /** Development helper for exercising the premium UI without paying. */
  devActivate: () => api.post<SubscriptionStatus>("/subscription/dev-activate").then((r) => r.data),
};
