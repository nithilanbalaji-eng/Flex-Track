import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { env } from "../config/env";
import { verifyAppleReceipt, AppleVerificationError } from "../services/appleIap";
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

const appleSchema = z.object({
  /** The base64 app receipt StoreKit handed the client. Apple signs it. */
  receipt: z.string().min(20),
});

/**
 * Grants Premium after checking the receipt with Apple.
 *
 * The client sends only the receipt; whether it entitles anything is decided by
 * Apple and recorded here. Nothing the app claims about its own subscription is
 * trusted, so an invented or edited receipt simply fails verification.
 */
router.post(
  "/apple/verify",
  asyncHandler(async (req: AuthedRequest, res) => {
    const { receipt } = appleSchema.parse(req.body);

    let verified;
    try {
      verified = await verifyAppleReceipt(receipt);
    } catch (err) {
      if (err instanceof AppleVerificationError) {
        // 402: the request was well-formed and authenticated, the purchase just
        // doesn't entitle anything.
        throw new ApiError(402, err.message);
      }
      throw err;
    }

    // One Apple subscription shouldn't unlock several accounts. If this receipt
    // is already attached elsewhere, refuse rather than silently sharing it.
    const existing = await prisma.user.findFirst({
      where: { subscriptionId: verified.originalTransactionId, NOT: { id: req.userId! } },
      select: { id: true },
    });
    if (existing) {
      throw new ApiError(
        409,
        "That App Store subscription is already linked to a different Flex Track account."
      );
    }

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data: {
        isPremium: verified.isActive,
        premiumUntil: verified.expiresAt,
        subscriptionId: verified.originalTransactionId,
        subscriptionStore: "apple",
        appleReceipt: verified.latestReceipt,
      },
    });

    res.json({ ...statusPayload(user), willRenew: verified.willRenew, environment: verified.environment });
  })
);

router.post(
  "/cancel",
  asyncHandler(async (req: AuthedRequest, res) => {
    const current = await loadUser(req.userId!);
    if (!isPremiumActive(current)) throw ApiError.badRequest("You don't have an active subscription");

    // Only Apple can cancel an App Store subscription. Flipping our own flag
    // would hide the subscription while Apple kept charging for it, so say so
    // instead and point at the one place that actually works.
    if (current.subscriptionStore === "apple") {
      throw new ApiError(
        409,
        "App Store subscriptions are managed by Apple. Open Settings › your name › Subscriptions on your iPhone to cancel."
      );
    }

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
