import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { subscriptionApi } from "../api/subscription";
import { extractErrorMessage } from "../api/client";
import { PREMIUM_PRODUCT_ID } from "../config/products";

/**
 * StoreKit purchase flow.
 *
 * react-native-iap ships native code, so it isn't present in Expo Go - the
 * module is loaded lazily and its absence is reported as "unavailable" rather
 * than crashing the app. Everything else keeps working; only the buy button is
 * disabled.
 *
 * Entitlement is never decided here. A completed purchase produces a receipt,
 * the receipt goes to the server, and the server asks Apple. The transaction is
 * only finished once the server has recorded it, so a purchase interrupted by a
 * crash or lost connection is replayed by StoreKit next launch instead of being
 * silently lost.
 */

type IapModule = typeof import("react-native-iap");

let iap: IapModule | null = null;
let iapLoadError: string | null = null;

function loadIap(): IapModule | null {
  if (iap || iapLoadError) return iap;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    iap = require("react-native-iap") as IapModule;
  } catch {
    iapLoadError = "In-app purchases need a development build - they don't work in Expo Go.";
  }
  return iap;
}

export interface PurchaseState {
  /** False in Expo Go, on Android, or if StoreKit can't be reached. */
  available: boolean;
  /** Localised price string straight from the App Store, e.g. "£2.99". */
  priceLabel: string | null;
  loading: boolean;
  purchasing: boolean;
  error: string | null;
  unavailableReason: string | null;
}

export function usePurchases(onEntitlementChanged: () => void | Promise<void>) {
  const [state, setState] = useState<PurchaseState>({
    available: false,
    priceLabel: null,
    loading: true,
    purchasing: false,
    error: null,
    unavailableReason: null,
  });

  // Listeners must be torn down on unmount or they fire into a dead component.
  const subscriptions = useRef<{ remove: () => void }[]>([]);

  const patch = (p: Partial<PurchaseState>) => setState((s) => ({ ...s, ...p }));

  /** Sends the App Store receipt to our server, which decides entitlement. */
  const verifyWithServer = useCallback(async () => {
    const mod = loadIap();
    if (!mod) return;
    const receipt = await mod.getReceiptDataIOS();
    if (!receipt) throw new Error("The App Store didn't return a receipt. Please try again.");
    await subscriptionApi.verifyApple(receipt);
    await onEntitlementChanged();
  }, [onEntitlementChanged]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (Platform.OS !== "ios") {
        patch({ loading: false, available: false, unavailableReason: "Subscriptions are only available on iOS." });
        return;
      }

      const mod = loadIap();
      if (!mod) {
        patch({ loading: false, available: false, unavailableReason: iapLoadError });
        return;
      }

      try {
        await mod.initConnection();

        // StoreKit delivers purchases asynchronously, including ones that
        // completed while the app was closed.
        subscriptions.current.push(
          mod.purchaseUpdatedListener(async (purchase) => {
            try {
              await verifyWithServer();
              // Only now is it safe to finish - the server has the receipt.
              await mod.finishTransaction({ purchase });
            } catch (err) {
              patch({ error: extractErrorMessage(err) });
            } finally {
              patch({ purchasing: false });
            }
          })
        );

        subscriptions.current.push(
          mod.purchaseErrorListener((err) => {
            // Cancelling the sheet isn't an error worth showing.
            const cancelled = String(err?.code ?? "").toLowerCase().includes("cancel");
            patch({ purchasing: false, error: cancelled ? null : err?.message ?? "The purchase didn't complete." });
          })
        );

        const products = await mod.fetchProducts({ skus: [PREMIUM_PRODUCT_ID], type: "subs" });
        const product = Array.isArray(products) ? products[0] : undefined;

        if (cancelled) return;
        patch({
          loading: false,
          available: Boolean(product),
          priceLabel: (product as { displayPrice?: string } | undefined)?.displayPrice ?? null,
          unavailableReason: product
            ? null
            : "This subscription isn't available from the App Store yet.",
        });
      } catch (err) {
        if (cancelled) return;
        patch({ loading: false, available: false, unavailableReason: extractErrorMessage(err) });
      }
    })();

    return () => {
      cancelled = true;
      subscriptions.current.forEach((s) => s.remove());
      subscriptions.current = [];
      loadIap()?.endConnection?.();
    };
  }, [verifyWithServer]);

  const purchase = useCallback(async () => {
    const mod = loadIap();
    if (!mod) return;
    patch({ purchasing: true, error: null });
    try {
      // Resolves when the sheet is dismissed; the actual purchase arrives on
      // the listener above.
      await mod.requestPurchase({ request: { apple: { sku: PREMIUM_PRODUCT_ID } }, type: "subs" });
    } catch (err) {
      patch({ purchasing: false, error: extractErrorMessage(err) });
    }
  }, []);

  /** Apple requires a way to restore purchases on a new device. */
  const restore = useCallback(async () => {
    const mod = loadIap();
    if (!mod) return { restored: false, message: iapLoadError ?? "Not available." };
    patch({ purchasing: true, error: null });
    try {
      await mod.restorePurchases();
      await verifyWithServer();
      return { restored: true, message: "Your subscription has been restored." };
    } catch (err) {
      return { restored: false, message: extractErrorMessage(err) };
    } finally {
      patch({ purchasing: false });
    }
  }, [verifyWithServer]);

  /** Opens Apple's subscription settings - the only place a sub can be cancelled. */
  const manage = useCallback(async () => {
    const mod = loadIap();
    await mod?.deepLinkToSubscriptionsIOS?.();
  }, []);

  return { ...state, purchase, restore, manage };
}
