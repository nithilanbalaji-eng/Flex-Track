/**
 * Premium subscription state.
 *
 * Flex Track shows ads to everyone without an active subscription. Payment
 * capture itself is deliberately provider-agnostic: the web app will settle
 * through Stripe, while the iOS app must use Apple In-App Purchase (Apple
 * rejects third-party payment for digital goods and takes 15-30%). Both
 * ultimately call `activatePremium` with their own store identifier, so the
 * rest of the app never needs to know which one paid.
 */

export const PREMIUM_PRICE_USD = 2.99;
export const PREMIUM_PRODUCT_ID = "flextrack_premium_monthly";

interface PremiumFields {
  isPremium: boolean;
  premiumUntil: Date | null;
}

/**
 * A cancelled subscription keeps its benefits until the paid period ends, so
 * "is premium" is not simply the boolean column.
 */
export function isPremiumActive(user: PremiumFields, now = new Date()): boolean {
  if (!user.isPremium) return false;
  if (!user.premiumUntil) return true; // no expiry recorded = active
  return user.premiumUntil.getTime() > now.getTime();
}

/** Whether this user should be served ads. */
export function shouldShowAds(user: PremiumFields, now = new Date()): boolean {
  return !isPremiumActive(user, now);
}

/** One month from `from`, used when a payment succeeds or renews. */
export function addBillingPeriod(from = new Date()): Date {
  const until = new Date(from);
  until.setMonth(until.getMonth() + 1);
  return until;
}
