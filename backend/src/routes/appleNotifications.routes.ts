import { Router } from "express";
import { prisma } from "../lib/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { verifyAppleReceipt } from "../services/appleIap";

const router = Router();

/**
 * App Store Server Notifications.
 *
 * Without this, a subscription that renews, lapses or gets refunded stays
 * whatever it was the last time the app happened to open. Apple posts here
 * when the state changes.
 *
 * The notification body is deliberately treated as untrusted: it is only used
 * to work out *which* account changed. Entitlement is then re-derived by
 * re-verifying that user's stored receipt with Apple, so a forged POST to this
 * URL can't grant anyone anything - the worst it can do is make us ask Apple a
 * question we already knew the answer to.
 */

/** Decodes a JWS segment without verifying it - see the note above. */
function decodeJwsPayload<T>(jws: string): T | null {
  try {
    const [, payload] = jws.split(".");
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

interface NotificationPayload {
  notificationType?: string;
  subtype?: string;
  data?: {
    signedTransactionInfo?: string;
    signedRenewalInfo?: string;
    environment?: string;
  };
}

interface TransactionInfo {
  originalTransactionId?: string;
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    // Always acknowledge. Apple retries on a non-2xx, and a retry storm helps
    // nobody when the payload is one we can't act on anyway.
    const signedPayload = (req.body as { signedPayload?: string })?.signedPayload;
    if (!signedPayload) {
      res.status(200).json({ ok: true, ignored: "no signedPayload" });
      return;
    }

    const payload = decodeJwsPayload<NotificationPayload>(signedPayload);
    const transaction = payload?.data?.signedTransactionInfo
      ? decodeJwsPayload<TransactionInfo>(payload.data.signedTransactionInfo)
      : null;

    const originalTransactionId = transaction?.originalTransactionId;
    if (!originalTransactionId) {
      res.status(200).json({ ok: true, ignored: "no transaction id" });
      return;
    }

    const user = await prisma.user.findFirst({
      where: { subscriptionId: originalTransactionId, subscriptionStore: "apple" },
    });

    // A notification for a subscription we've never seen - nothing to update.
    if (!user?.appleReceipt) {
      res.status(200).json({ ok: true, ignored: "unknown subscription" });
      return;
    }

    try {
      const verified = await verifyAppleReceipt(user.appleReceipt);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isPremium: verified.isActive,
          premiumUntil: verified.expiresAt,
          appleReceipt: verified.latestReceipt,
        },
      });
      console.log(
        `Apple notification ${payload?.notificationType}/${payload?.subtype ?? "-"} for user ${user.id}: ` +
          `active=${verified.isActive} until=${verified.expiresAt?.toISOString() ?? "-"}`
      );
    } catch (err) {
      // Don't ask Apple to retry - the receipt is what it is, and a failure here
      // is logged rather than left to hammer the endpoint.
      console.error("Failed to re-verify receipt after Apple notification", err);
    }

    res.status(200).json({ ok: true });
  })
);

export default router;
