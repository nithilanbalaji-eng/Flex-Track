import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

/**
 * API client.
 *
 * Two things differ from the web build:
 *  - The token lives in the device keychain via SecureStore rather than
 *    localStorage, so it survives app restarts and isn't readable by other apps.
 *  - SecureStore is async, so the token is cached in memory after the first read
 *    and the request interceptor stays synchronous.
 */

const API_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "https://flex-track-8sag.onrender.com/api";

export const api = axios.create({
  baseURL: API_URL,
  // Render's free tier sleeps after inactivity and can take ~50s to wake.
  timeout: 60000,
});

const TOKEN_KEY = "flextrack_token";

let cachedToken: string | null = null;

/** Called once at startup, before anything renders. */
export async function loadStoredToken(): Promise<string | null> {
  try {
    cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    cachedToken = null;
  }
  return cachedToken;
}

export function getToken(): string | null {
  return cachedToken;
}

export async function setToken(token: string | null): Promise<void> {
  cachedToken = token;
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Keychain write failed - the in-memory token still works for this session.
  }
}

api.interceptors.request.use((config) => {
  if (cachedToken) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${cachedToken}`;
  }
  return config;
});

/**
 * Notifies the app when the server rejects our token, so it can drop back to
 * the sign-in screen. The web build redirected via location.assign, which has
 * no equivalent here.
 */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  onUnauthorized = handler;
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      void setToken(null);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  }
);

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.code === "ECONNABORTED") {
      return "The server is taking a while to respond. It may be waking up - please try again.";
    }
    if (!err.response) {
      return "Can't reach Flex Track. Check your connection and try again.";
    }
    return err.response.data?.error ?? err.message;
  }
  return err instanceof Error ? err.message : "Something went wrong";
}
