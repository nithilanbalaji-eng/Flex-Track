import { useState } from "react";

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }) => void;
        signIn: () => Promise<{
          authorization: { id_token: string };
          user?: { name?: { firstName?: string; lastName?: string } };
        }>;
      };
    };
  }
}

const clientId = import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined;
let sdkPromise: Promise<void> | null = null;

function loadAppleSdk(): Promise<void> {
  if (window.AppleID) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Sign in with Apple"));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export function AppleButton({
  onToken,
  onError,
}: {
  onToken: (identityToken: string, fullName?: string) => void;
  onError?: (message: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (!clientId) {
      onError?.("Sign in with Apple isn't configured yet. Set VITE_APPLE_CLIENT_ID.");
      return;
    }
    setBusy(true);
    try {
      await loadAppleSdk();
      window.AppleID!.auth.init({
        clientId,
        scope: "name email",
        redirectURI: window.location.origin,
        usePopup: true,
      });
      const result = await window.AppleID!.auth.signIn();
      const fullName = result.user?.name
        ? [result.user.name.firstName, result.user.name.lastName].filter(Boolean).join(" ")
        : undefined;
      onToken(result.authorization.id_token, fullName);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Sign in with Apple failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      title={!clientId ? "Set VITE_APPLE_CLIENT_ID to enable Sign in with Apple" : undefined}
      className="btn w-full bg-black text-white hover:bg-black/85 disabled:opacity-60"
    >
      <AppleIcon /> {busy ? "Connecting…" : "Continue with Apple"}
    </button>
  );
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 384 512" fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}
