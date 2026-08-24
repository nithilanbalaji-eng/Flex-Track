import { env } from "../config/env";
import { PREMIUM_PRODUCT_ID } from "./subscription";

/**
 * Apple In-App Purchase receipt verification.
 *
 * Entitlement is decided here, on the server, by asking Apple directly. The
 * client never gets to say whether it paid - it only hands over the receipt it
 * received from StoreKit, which Apple signs. A tampered or invented receipt
 * fails verification.
 *
 * Uses the verifyReceipt endpoint: a single HTTPS call, no JWT signing or
 * certificate-chain validation to get wrong, and it returns the full renewal
 * history in one response.
 */

const PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";
const SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";

/** Apple sends this when a sandbox receipt is checked against production. */
const SANDBOX_RECEIPT_STATUS = 21007;

/** Human-readable reasons for the status codes worth distinguishing. */
const STATUS_MESSAGES: Record<number, string> = {
  21000: "Apple could not read the request.",
  21002: "The receipt was malformed.",
  21003: "The receipt could not be authenticated.",
  21004: "The shared secret does not match the one on file for this app.",
  21005: "Apple's receipt server is temporarily unavailable.",
  21008: "A production receipt was sent to the sandbox environment.",
  21010: "This account could not be authorised.",
};

interface AppleTransaction {
  product_id: string;
  original_transaction_id: string;
  transaction_id: string;
  expires_date_ms?: string;
  purchase_date_ms?: string;
  cancellation_date_ms?: string;
  is_trial_period?: string;
}

interface AppleResponse {
  status: number;
  environment?: string;
  latest_receipt?: string;
  latest_receipt_info?: AppleTransaction[];
  pending_renewal_info?: { auto_renew_status?: string; expiration_intent?: string }[];
}

export interface VerifiedSubscription {
  originalTransactionId: string;
  productId: string;
  /** When the current period ends. Null for a receipt with no subscription. */
  expiresAt: Date | null;
  /** True when the subscription is paid up right now. */
  isActive: boolean;
  /** True when the user turned off auto-renew but hasn't expired yet. */
  willRenew: boolean;
  environment: "Production" | "Sandbox";
  /** Apple rotates the receipt on renewal; store the newest one. */
  latestReceipt: string;
}

export class AppleVerificationError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

async function post(url: string, receiptData: string): Promise<AppleResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      "receipt-data": receiptData,
      password: env.apple.sharedSecret,
      // We only care about the current state of the subscription.
      "exclude-old-transactions": true,
    }),
  });

  if (!response.ok) {
    throw new AppleVerificationError(`Apple returned HTTP ${response.status} while verifying the receipt.`);
  }
  return (await response.json()) as AppleResponse;
}

/**
 * Verifies a receipt and returns what Apple says about the subscription.
 *
 * Always tries production first. Apple's guidance is to fall back to sandbox on
 * status 21007 rather than branching on a build flag, because review builds
 * submit sandbox receipts against the production endpoint.
 */
export async function verifyAppleReceipt(receiptData: string): Promise<VerifiedSubscription> {
  if (!env.apple.sharedSecret) {
    throw new AppleVerificationError("Apple In-App Purchase is not configured on this server.");
  }

  let body = await post(PRODUCTION_URL, receiptData);
  let environment: "Production" | "Sandbox" = "Production";

  if (body.status === SANDBOX_RECEIPT_STATUS) {
    body = await post(SANDBOX_URL, receiptData);
    environment = "Sandbox";
  }

  if (body.status !== 0) {
    throw new AppleVerificationError(
      STATUS_MESSAGES[body.status] ?? `Apple rejected the receipt (status ${body.status}).`,
      body.status
    );
  }

  const transactions = (body.latest_receipt_info ?? []).filter((t) => t.product_id === PREMIUM_PRODUCT_ID);
  if (transactions.length === 0) {
    throw new AppleVerificationError("That receipt doesn't contain a Flex Track Premium subscription.");
  }

  // Renewals append to the list; the one that expires last is the current one.
  const latest = transactions.reduce((newest, t) =>
    Number(t.expires_date_ms ?? 0) > Number(newest.expires_date_ms ?? 0) ? t : newest
  );

  const expiresAt = latest.expires_date_ms ? new Date(Number(latest.expires_date_ms)) : null;

  // A refunded or upgraded-away purchase carries a cancellation date and should
  // lose access immediately, regardless of the period it was paid through.
  const cancelled = Boolean(latest.cancellation_date_ms);
  const isActive = !cancelled && Boolean(expiresAt && expiresAt.getTime() > Date.now());

  const willRenew = body.pending_renewal_info?.[0]?.auto_renew_status === "1";

  return {
    originalTransactionId: latest.original_transaction_id,
    productId: latest.product_id,
    expiresAt,
    isActive,
    willRenew,
    environment,
    latestReceipt: body.latest_receipt ?? receiptData,
  };
}
