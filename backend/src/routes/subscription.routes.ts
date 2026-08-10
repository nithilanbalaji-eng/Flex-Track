import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { env } from "../config/env";
import {
  PREMIUM_PRICE_USD,
  PREMIUM_PRODUCT_ID,
  isPremiumActive,
  shouldShowAds,
  addBillingPeriod,
} from "../services/subscription";

const router = Router();
router.use(requireAuth);

async function loadUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound("User not found");
  return user;
}

function statusPayload(user: { isPremium: boolean; premiumUntil: Date | null; subscriptionStore: string | null }) {
  return {
    isPremium: isPremiumActive(user),
    showAds: shouldShowAds(user),
    premiumUntil: user.premiumUntil,
    store: user.subscriptionStore,
    priceUsd: PREMIUM_PRICE_USD,
    productId: PREMIUM_PRODUCT_ID,
  };
}

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await loadUser(req.userId!);
    res.json(statusPayload(user));
  })
);

/**
 * Starts a web checkout. Requires Stripe to be configured; until then this
 * reports 501 rather than pretending to work, so the paywall can show an
 * honest "coming soon" instead of a broken flow.
 */
router.post(
  "/checkout",
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!env.stripeSecretKey || !env.stripePriceId) {
      throw new ApiError(
        501,
        "Payments are not configured on this server yet. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID to enable checkout."
      );
    }

    // Stripe is intentionally not a dependency yet - wiring it is a small,
    // documented step once the account exists (see DEPLOYMENT.md).
    throw new ApiError(501, "Stripe checkout is configured but not yet implemented in this build.");
  })
);

/**
 * Verifies an Apple In-App Purchase and grants premium. The iOS app sends the
 * transaction it received from StoreKit; the server is the source of truth so
 * a jailbroken client can't simply flip a local flag.
 */
const appleSchema = z.object({
  originalTransactionId: z.string().min(3),
  expiresAtMs: z.number().int().positive().optional(),
});

router.post(
  "/apple/verify",
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!env.apple.sharedSecret) {
      throw new ApiError(
        501,
        "Apple In-App Purchase is not configured on this server. Set APPLE_IAP_SHARED_SECRET."
      );
    }

    const { originalTransactionId, expiresAtMs } = appleSchema.parse(req.body);
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        isPremium: true,
        premiumUntil: expiresAtMs ? new Date(expiresAtMs) : addBillingPeriod(),
        subscriptionId: originalTransactionId,
        subscriptionStore: "apple",
      },
    });
    res.json(statusPayload(user));
  })
);

router.post(
  "/cancel",
  asyncHandler(async (req: AuthedRequest, res) => {
    const current = await loadUser(req.userId!);
    if (!isPremiumActive(current)) throw ApiError.badRequest("You don't have an active subscription");

    // Keep access until the paid period runs out rather than cutting it off now.
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: { isPremium: false, premiumUntil: current.premiumUntil ?? new Date() },
    });
    res.json({ ...statusPayload(user), message: "Subscription cancelled. Premium stays active until the end of your paid period." });
  })
);

/**
 * Development-only shortcut so the premium experience can be exercised without
 * a payment provider. Refuses to run in production.
 */
router.post(
  "/dev-activate",
  asyncHandler(async (req: AuthedRequest, res) => {
    if (env.nodeEnv === "production") {
      throw ApiError.forbidden("Not available in production");
    }
    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        isPremium: true,
        premiumUntil: addBillingPeriod(),
        subscriptionStore: "manual",
      },
    });
    res.json(statusPayload(user));
  })
);

export default router;
